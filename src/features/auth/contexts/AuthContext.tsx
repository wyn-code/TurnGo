import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";


import type { ReactNode } from "react";

import apiClient from "@/lib/api-client";
import { authService } from "@/features/auth/services/auth.service";

interface User {
  id?: string;
  email: string;
  name?: string;
  hasBusiness?: boolean;
  negocioId?: number | null;
  negocioSlug?: string | null;
  role?: string;
}

type SessionResult =
  | { success: true; user: User }
  | { success: false; error: string };

type AuthResult =
  | SessionResult
  | { success: false; requires2fa: true };

type GoogleAuthResult =
  | SessionResult
  | { success: false; needsVerification: true; email: string };

type RegisterResult =
  | { success: true }
  | { success: false; error: string };

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingTwoFaEmail: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;

  setPendingTwoFaEmail: (email: string) => void;
  clearPendingTwoFaEmail: () => void;

  verifyTwoFactorCode: (
    email: string,
    otp: string,
  ) => Promise<AuthResult>;

  verifyCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;


  loginWithToken: (
    token: string,
  ) => Promise<AuthResult>;

  refreshUser: () => Promise<User | null>;

  loginWithGoogle: (
    credential: string,
  ) => Promise<GoogleAuthResult>;

register: (
  usuario: string,
  email: string,
  password: string,
  nombre: string,
  apellido: string,
) => Promise<RegisterResult>;

  requestPasswordReset: (
    email: string,
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  resetPassword: (
    token: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "turnexo_user";
const TOKEN_KEY = "turnexo_token";
const PENDING_2FA_EMAIL_KEY = "turnexo_pending_2fa_email";

const verifyCredentials = async (
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await authService.verifyCredentials({
      email_us: email.trim(),
      contrasena_us: password,
    });

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: normalizeApiDetail(
        error instanceof Error
          ? error.message
          : error,
      ),
    };
  }
};

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id_us ?? ""),
    email: String(raw.email_us ?? ""),
    name: String(raw.usuario_us ?? ""),
    hasBusiness: Boolean(raw.has_business),
    negocioId: raw.negocio_id ? Number(raw.negocio_id) : null,
    negocioSlug: raw.negocio_slug ? String(raw.negocio_slug) : null,
    role: String(raw.role ?? "").toLowerCase(),
  };
} 


function normalizeApiDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((e) =>
        typeof e === "object" &&
        e &&
        "msg" in e
          ? String((e as { msg: string }).msg)
          : JSON.stringify(e),
      )
      .join(", ");
  }

  if (
    detail &&
    typeof detail === "object" &&
    "msg" in detail
  ) {
    return String(
      (detail as { msg: string }).msg
    );
  }

  return "Error al procesar la solicitud";
}

function loginBody(
  email: string,
  password: string,
) {
  return {
    email_us: email.trim(),
    contrasena_us: password,
  };
}

async function applySessionFromToken(
  token: string,
  setUser: (u: User | null) => void,
  setToken: (t: string | null) => void,
): Promise<SessionResult> {
  localStorage.setItem(
    TOKEN_KEY,
    token,
  );

  setToken(token);

  apiClient.setToken(token);

  try {
    const userData = await authService.me();

    const user = normalizeUser(
      userData as unknown as Record<
        string,
        unknown
      >,
    );

    setUser(user);

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user),
    );

    return {
      success: true,
      user,
    };
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);

    localStorage.removeItem(USER_KEY);

    apiClient.clearToken();

    setUser(null);

    setToken(null);

    return {
      success: false,
      error:
        normalizeApiDetail(
          error instanceof Error
            ? error.message
            : error,
        ) || "No se pudo obtener el perfil",
    };
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [pendingTwoFaEmail, setPendingTwoFaEmailState] = useState<string | null>(
    () => localStorage.getItem(PENDING_2FA_EMAIL_KEY),
  );

  const setPendingTwoFaEmail = (email: string) => {
    localStorage.setItem(PENDING_2FA_EMAIL_KEY, email);
    setPendingTwoFaEmailState(email);
  };

  const clearPendingTwoFaEmail = () => {
    localStorage.removeItem(PENDING_2FA_EMAIL_KEY);
    setPendingTwoFaEmailState(null);
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const storedToken =
          localStorage.getItem(
            TOKEN_KEY,
          );

        if (storedToken) {
          apiClient.setToken(storedToken);

          const session =
            await applySessionFromToken(
              storedToken,
              setUser,
              setToken,
            );

          if (!session.success) {
            setUser(null);
            setToken(null);
          }

          return;
        }

        const storedUser =
          localStorage.getItem(
            USER_KEY,
          );

        if (storedUser) {
          localStorage.removeItem(USER_KEY);
        }
      } catch {
        localStorage.removeItem(
          USER_KEY,
        );

        localStorage.removeItem(
          TOKEN_KEY,
        );

        apiClient.clearToken();

        setUser(null);

        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    void initSession();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      const data =
        await authService.login(
          loginBody(
            email,
            password,
          ),
        );

      if ("requires_2fa" in data && data.requires_2fa) {
        setPendingTwoFaEmail(data.email);
        setIsLoading(false);
        return { success: false, requires2fa: true };
      }

      const token =
        (data as { access_token: string }).access_token;

      if (!token) {
        return {
          success: false,
          error:
            "Respuesta del servidor sin token",
        };
      }

      clearPendingTwoFaEmail();

      return await applySessionFromToken(
        token,
        setUser,
        setToken,
      );
    } catch (error: unknown) {
      console.error(
        "LOGIN ERROR:",
        error,
      );

      return {
        success: false,
        error: normalizeApiDetail(
          error instanceof Error
            ? error.message
            : error,
        ),
      };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactorCode = async (
  email: string,
  otp: string,
): Promise<AuthResult> => {
  setIsLoading(true);

  try {
    const data =
      await authService.verifyTwoFactorCode({
        email_us: email,
        otp_code: otp,
      });

    return await applySessionFromToken(
      data.access_token,
      setUser,
      setToken,
    );
  } catch (error: unknown) {
    return {
      success: false,
      error: normalizeApiDetail(
        error instanceof Error
          ? error.message
          : error,
      ),
    };
  } finally {
    setIsLoading(false);
  }
};

  const loginWithToken = async (
  token: string,
): Promise<AuthResult> => {
  setIsLoading(true);

  try {
    return await applySessionFromToken(
      token,
      setUser,
      setToken,
    );
  } finally {
    setIsLoading(false);
  }
};

 const loginWithGoogle = async (
  credential: string,
): Promise<GoogleAuthResult> => {
  setIsLoading(true);

  try {
    const data = await authService.googleLogin(credential);

  if ("access_token" in data) {
    clearPendingTwoFaEmail();
    return await applySessionFromToken(
      data.access_token,
      setUser,
      setToken,
    );
  }

  return {
    success: false,
    needsVerification: true,
    email: data.email,
  };
  } catch (error: unknown) {
    return {
      success: false,
      error: normalizeApiDetail(
        error instanceof Error ? error.message : error,
      ),
    };
  } finally {
    setIsLoading(false);
  }
};

const register = async (
  usuario: string,
  email: string,
  password: string,
  nombre: string,
  apellido: string,
): Promise<RegisterResult> => {
  try {
    await authService.register({
      usuario_us: usuario.trim(),
      email_us: email.trim(),
      contrasena_us: password,
      nombre_us: nombre.trim(),
      apellido_us: apellido.trim(),
    });

    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: normalizeApiDetail(
        error instanceof Error
          ? error.message
          : error,
      ),
    };
  }
};

  const requestPasswordReset = async (
  email: string,
) => {
  try {
    await authService.requestPasswordReset(
      email,
    );

    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: normalizeApiDetail(
        error instanceof Error
          ? error.message
          : error,
      ),
    };
  }
};

const resetPassword = async (
  token: string,
  password: string,
  confirmPassword: string,
) => {
  try {
    await authService.resetPassword(
      token,
      password,
      confirmPassword,
    );

    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: normalizeApiDetail(
        error instanceof Error ? error.message : error,
      ),
    };
  }
};

const logout = () => {
  setUser(null);

  setToken(null);

  localStorage.removeItem(USER_KEY);

  localStorage.removeItem(TOKEN_KEY);

  clearPendingTwoFaEmail();

  apiClient.clearToken();
};

  const refreshUser = async (): Promise<User | null> => {
    try {
      const userData = await authService.me();

      const refreshedUser = normalizeUser(
        userData as unknown as Record<
          string,
          unknown
        >,
      );

      setUser(refreshedUser);

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(refreshedUser),
      );

      return refreshedUser;
    } catch {
      return null;
    }
  };

  return (
<AuthContext.Provider
  value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      pendingTwoFaEmail,
      setPendingTwoFaEmail,
      clearPendingTwoFaEmail,

      login,
      verifyCredentials,
      loginWithToken,
      loginWithGoogle,
      refreshUser,

      register,

      requestPasswordReset,
      resetPassword,
      verifyTwoFactorCode,
      logout,
  }}
>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within AuthProvider",
    );
  }

  return ctx;
}