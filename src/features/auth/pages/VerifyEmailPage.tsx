import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "@/features/auth/services/auth.service";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useRef } from "react";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const alreadyVerified = useRef(false);

  const { loginWithToken } = useAuth();

  const [loading, setLoading] = useState(true);

  const [success, setSuccess] = useState(false);

  const [message, setMessage] = useState("");

useEffect(() => {
  if (!token) return;

  if (alreadyVerified.current) {
    return;
  }

  alreadyVerified.current = true;

  const verifyEmail = async () => {
    try {
      const response = await authService.verifyEmail(token) as { access_token: string };
      await loginWithToken(response.access_token);

      setSuccess(true);

      setMessage(
        "Email verificado correctamente. Redirigiendo..."
      );

      setTimeout(() => {
        navigate("/registrar-negocio");
      }, 2000);

    } catch (error: unknown) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo verificar el email."
      );
    } finally {
      setLoading(false);
    }
  };

  verifyEmail();
}, [token, navigate, loginWithToken]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Verificando email...</h1>
        <p className="mb-6">Un momento por favor.</p>
      </div>
    );
  }

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">
        {success ? "Email verificado" : "Error"}
      </h1>

      <p className="mb-6">
        {message}
      </p>
    </div>
  );
}
