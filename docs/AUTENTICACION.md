# Autenticación — TurnoGo Frontend

Análisis exhaustivo de **todos los mecanismos de autenticación y autorización** implementados en el frontend. Solo se documenta lo que existe en el código.

---

## 1. Arquitectura de autenticación

```mermaid
flowchart TB
    subgraph UI["Capa UI"]
        LG[Login.tsx]
        RG[Registro.tsx]
        VC[VerificarCodigo.tsx]
        VP[VerifyEmailPage.tsx]
        OC[OlvideContrasena.tsx]
        RC[RestablecerContrasena.tsx]
    end

    subgraph CTX["AuthContext (src/features/auth/contexts/AuthContext.tsx)"]
        ST[Estado: user, token, isLoading,\npendingTwoFaEmail]
        FN[Funciones: login, loginWithToken,\nloginWithGoogle, register,\nverifyCredentials, verifyTwoFactorCode,\nrequestPasswordReset, resetPassword,\nlogout, set/clearPendingTwoFaEmail]
        LS[Persistencia: localStorage\n(turnexo_token, turnexo_user,\nturnexo_pending_2fa_email)]
    end

    subgraph SVC["auth.service.ts\n(src/features/auth/services/auth.service.ts)"]
        API[Llamadas HTTP\na /auth/*]
    end

    subgraph HTTP["ApiClient (lib/api-client.ts)"]
        AC[setToken / clearToken\nAuthorization: Bearer]
    end

    subgraph GRD["Guards"]
        PR[ProtectedRoute.tsx]
        AR[AdminRoute.tsx]
    end

    UI --> CTX
    CTX --> SVC
    SVC --> HTTP
    CTX --> LS
    CTX --> GRD
```

---

## 2. Login (email / contraseña)

### 2.1 Flujo en `Login.tsx`

| Paso | Qué ocurre | Archivo / Función |
|------|------------|-------------------|
| 1 | Usuario ingresa email/usuario + contraseña | `Login.tsx` → `useForm` (RHF + Zod) |
| 2 | Submit → `useAuth().login(email, password)` | `AuthContext.login` |
| 3 | `authService.login({email_us, contrasena_us})` | `auth.service.ts:68-79` → `POST /auth/login` |
| 4a | Respuesta `{ access_token }` | `applySessionFromToken(token)` |
| 4b | Respuesta `{ requires_2fa: true, email }` | Guarda `pendingTwoFaEmail` → navega a `/verificar-codigo` |
| 5 | `applySessionFromToken`: guarda en `localStorage`, `apiClient.setToken`, `GET /auth/me` | `AuthContext.applySessionFromToken` |
| 6 | Normaliza usuario (`normalizeUser`) → `setUser` + `setToken` + `localStorage.setItem('turnexo_user')` | `AuthContext.normalizeUser` |
| 7 | Navega a `redirectPath` (desde `location.state.from`) o `/dashboard` | `Login.tsx:96` |

### 2.2 Respuesta del backend (observada en código)

```typescript
// auth.service.ts:68-79
// Éxito: { access_token: string, token_type: string }
// 2FA requerido: { requires_2fa: true, email: string }
```

### 2.3 Validaciones cliente (Zod en `Login.tsx:39-57`)

- `email`: requerido ("Ingresá tu email o usuario")
- `password`: mínimo 6 caracteres

---

## 3. Registro

### 3.1 Flujo en `Registro.tsx`

| Paso | Qué ocurre |
|------|------------|
| 1 | Formulario: usuario, email, contraseña, nombre, apellido (RHF + Zod) |
| 2 | `useAuth().register(usuario, email, password, nombre, apellido)` |
| 3 | `authService.register({ usuario_us, email_us, contrasena_us, nombre_us, apellido_us })` |
| 4 | **Payload enviado** incluye roles forzados: `role: "duenio", rol: "duenio", role_us: "duenio", rol_us: "duenio"` (`auth.service.ts:85-93`) |
| 4 | `POST /auth/register` → `{ access_token }` |
| 5 | `applySessionFromToken` igual que login → sesión + redirect a `/registrar-negocio` (por `ProtectedRoute` al ser dueño sin negocio) |

### 3.2 Validaciones Zod (inline en `Registro.tsx`)

- `usuario`: min 3, max 20, alfanumérico
- `email`: formato email
- `password`: min 8, 1 mayúscula, 1 minúscula, 1 número
- `nombre`, `apellido`: requeridos

---

## 4. Autenticación de dos factores (2FA)

### 4.1 Detección

Login responde `{ requires_2fa: true, email }` → `AuthContext.login`:
1. `setPendingTwoFaEmail(email)` → guarda en `localStorage` (`turnexo_pending_2fa_email`) + state
2. Navega a `/verificar-codigo`

### 4.2 Verificación (`VerificarCodigo.tsx`)

1. Input de 6 dígitos (InputOtp)
2. `useAuth().verifyTwoFactorCode(email, otp)` → `authService.verifyTwoFactorCode({ email_us, otp_code })`
3. `POST /auth/verify-2fa` → `{ access_token }`
4. `applySessionFromToken` → sesión completa → redirect a `redirectPath || "/dashboard"`

### 4.3 Verificación de credenciales previa (opcional)

Existe `authService.verifyCredentials({ email_us, contrasena_us })` → `POST /auth/verify-credentials` (usado internamente antes de 2FA para validar credenciales sin crear sesión).

---

## 5. Google OAuth

### 5.1 Componente `SocialAuthButtons.tsx`

- Usa **API global** `window.google.accounts.id` (no `@react-oauth/google`)
- `initialize({ client_id: VITE_GOOGLE_CLIENT_ID, callback: handleGoogleCredential })`
- `renderButton(buttonRef.current, { theme: "outline", size: "large", width: 300, text: "continue_with", shape: "rectangular", logo_alignment: "left" })`
- **Retry loop**: 20 intentos × 200ms esperando `window.google.accounts.id`

### 5.2 Callback `handleGoogleCredential(credential)`

1. `useAuth().loginWithGoogle(credential)` → `authService.googleLogin(credential)`
2. `POST /auth/google` body `{ id_token: credential }` (`auth.service.ts:111-122`)
3. Respuesta:
   - `{ access_token }` → `applySessionFromToken` → sesión + redirect
   - `{ message, email }` → `needsVerification: true` → muestra error "Cuenta creada. Revisá tu email para verificarla."

### 5.3 ⚠️ Estado actual

- El SDK de Google **no se carga** en `index.html` ni en ningún componente
- `VITE_GOOGLE_CLIENT_ID` **no está en `.env.local`** (referenciado en código pero ausente en entorno)
- Como está, el botón **no puede funcionar** salvo inyección externa del script

---

## 6. Verificación de email

### 6.1 Flujo (`VerifyEmailPage.tsx`)

1. Ruta `/verify-email/:token` recibe token en URL
2. `apiClient.get(\`/auth/verify-email/\${token}\`)` (NOTA: usa `apiClient.get` directo, no `getWithBase`)
2. Respuesta `{ access_token }` → `useAuth().loginWithToken(token)` → `applySessionFromToken`
3. Éxito → mensaje "Email verificado correctamente. Redirigiendo..." → 2s → `navigate("/registrar-negocio")`

### 6.2 Endpoint backend

`GET /auth/verify-email/:token` (idéntico al usado por `authService.verifyEmail` en `auth.service.ts:195-202`)

---

## 7. Recuperación de contraseña

### 7.1 Solicitud (`OlvideContrasena.tsx`)

1. Input email → `useAuth().requestPasswordReset(email)`
2. `authService.requestPasswordReset(email)` → `POST /auth/forgot-password` body `{ email_us: email }`

### 7.2 Restablecimiento (`RestablecerContrasena.tsx`)

Dos rutas:
- `/restablecer-contrasena` (sin token): formulario para solicitar email
- `/restablecer-contrasena/:token` (con token): formulario nueva contraseña

Con token:
1. `useAuth().resetPassword(token, password, confirmPassword)`
2. `authService.resetPassword(token, password, confirmPassword)` → `POST /auth/reset-password/:token` body `{ new_password, confirm_password }`
3. Éxito → navega a `/login`

---

## 8. Sesión y tokens

### 8.1 Token JWT

- **Formato**: `access_token` (string) devuelto por backend
- **Tipo**: Bearer token (JWT asumido; frontend no lo decodifica)
- **Almacenamiento**:
  - Memoria: `apiClient.token` (propiedad privada del singleton)
  - `localStorage`: `turnexo_token`
- **Inyección**: `apiClient.setToken(token)` → headers `Authorization: Bearer <token>`
- **Limpieza**: `apiClient.clearToken()` + `localStorage.removeItem('turnexo_token')`

### 8.2 Usuario (objeto `User` interno)

```typescript
// AuthContext.tsx:14-22
interface User {
  id?: string;
  email: string;
  name?: string;
  hasBusiness?: boolean;
  negocioId?: number | null;
  negocioSlug?: string | null;
  role?: string; // "admin" | "duenio"
}
```

- **Origen**: `GET /auth/me` (`authService.me()`) tras login/verificación
- **Normalización**: `normalizeUser(raw)` mapea campos backend (`id_us`, `email_us`, `usuario_us`, `has_business`, `negocio_id`, `negocio_slug`, `role/rol/role_us/rol_us`)
- **Persistencia**: `localStorage.setItem('turnexo_user', JSON.stringify(user))`

### 8.3 Hidratación al montar (`AuthContext.tsx:266-320`)

```typescript
useEffect(() => {
  const storedToken = localStorage.getItem('turnexo_token');
  if (storedToken) {
    apiClient.setToken(storedToken);
    const session = await applySessionFromToken(storedToken, setUser, setToken);
    if (!session.success) { clearAll(); }
  } else {
    // limpia user huérfano si existe
  }
}, []);
```

- Si `GET /auth/me` falla (401, token expirado, etc.) → limpia todo y queda sin sesión.

### 8.4 2FA pendiente

- `localStorage.turnexo_pending_2fa_email` persiste el email entre recargas
- `AuthContext` lo lee al montar: `useState(() => localStorage.getItem(...))`
- `ProtectedRoute` lo usa: si `!isAuthenticated && pendingTwoFaEmail` → redirect a `/verificar-codigo`

---

## 9. Protección de rutas

### 9.1 `ProtectedRoute.tsx` (dueño / rutas generales)

```typescript
// Lógica en orden:
1. if (isLoading) → spinner
2. if (!isAuthenticated && pendingTwoFaEmail) → /verificar-codigo
3. if (!isAuthenticated) → /login (state.from = location.pathname)
4. if (user.role === "admin") {
     if (path startsWith /admin OR /planes OR /mi-suscripcion) → allow
     else → /admin
   }
5. if (user.role === "duenio" && !hasBusiness && path !== /registrar-negocio) → /registrar-negocio
6. if (user.role === "duenio" && hasBusiness && path === /registrar-negocio) → /dashboard
7. → allow children
```

**Rutas envueltas** (en `App.tsx`):
- `/registrar-negocio`
- `/dashboard/*`
- `/planes`
- `/mi-suscripcion`

### 9.2 `AdminRoute.tsx` (solo admin)

```typescript
// src/features/admin/components/AdminRoute.tsx
if (isLoading) return "Cargando...";
if (!user && pendingTwoFaEmail) → /verificar-codigo
if (!user) → /login
if (user.role !== "admin") → /dashboard
return children;
```

**Ruta envuelta**: `/admin/*` (en `App.tsx`)

### 9.3 Verificación inline adicional

- `AdminPanel.tsx:20` verifica `user.role !== "admin"` → redirect `/login`
- `Dashboard.tsx` no verifica rol (confía en `ProtectedRoute`)

---

## 10. Roles y autorización

| Rol | Origen | Qué permite |
|-----|--------|-------------|
| `admin` | `AuthUserResponse.role` (`"admin"`) | `/admin/*`, `/planes`, `/mi-suscripcion` (via `ProtectedRoute`); CRUD usuarios/negocios en admin |
| `duenio` | `role === "duenio"` | `/dashboard/*`, `/registrar-negocio` (si no tiene negocio), `/planes`, `/mi-suscripcion` |
| (sin rol / no autenticado) | — | Solo rutas públicas |

**Registro fuerza rol**: `authService.register` envía `role: "duenio"` (4 variantes de campo por compatibilidad backend).

**Cambio de rol**: No hay UI para cambiar rol; solo admin vía `PUT /usuarios/:id` con `role_us`.

---

## 11. Logout

`AuthContext.logout()` (`AuthContext.tsx:541-553`):

```typescript
const logout = () => {
  setUser(null);
  setToken(null);
  localStorage.removeItem('turnexo_user');
  localStorage.removeItem('turnexo_token');
  clearPendingTwoFaEmail(); // removeItem('turnexo_pending_2fa_email')
  apiClient.clearToken();
};
```

Invocado desde:
- `DashboardHeader.tsx` (botón "Salir")
- `Login.tsx` (no, solo login)
- `AdminPanel.tsx` (botón "Salir")

---

## 12. Comunicación con backend (endpoints de auth)

| Método | Path | Body / Params | Respuesta | Usado en |
|--------|------|---------------|-----------|----------|
| `POST` | `/auth/login` | `{ email_us, contrasena_us }` | `{ access_token }` \| `{ requires_2fa, email }` | `authService.login` |
| `POST` | `/auth/register` | `{ usuario_us, email_us, contrasena_us, nombre_us, apellido_us, role: "duenio", ... }` | `{ access_token }` | `authService.register` |
| `GET` | `/auth/me` | — | `AuthUserResponse` | `authService.me` (tras login) |
| `POST` | `/auth/google` | `{ id_token }` | `{ access_token }` \| `{ message, email }` | `authService.googleLogin` |
| `POST` | `/auth/forgot-password` | `{ email_us }` | void | `authService.requestPasswordReset` |
| `POST` | `/auth/reset-password/:token` | `{ new_password, confirm_password }` | void | `authService.resetPassword` |
| `POST` | `/auth/verify-credentials` | `{ email_us, contrasena_us }` | void | `authService.verifyCredentials` |
| `POST` | `/auth/verify-2fa` | `{ email_us, otp_code }` | `{ access_token }` | `authService.verifyTwoFactorCode` |
| `GET` | `/auth/verify-email/:token` | — | `{ access_token }` | `authService.verifyEmail` + `VerifyEmailPage` |

> Todos los endpoints de auth usan `postWithBase`/`getWithBase` con `skipAuthRedirect: true, omitAuth: true` para evitar redirección 401 y no enviar token.

---

## 13. Manejo de errores de auth

- `normalizeApiDetail` (`AuthContext.tsx:140-168`): extrae mensaje de `detail` (string, array con `msg`, o objeto con `msg`).
- `AuthContext` captura errores en `try/catch` y devuelve `{ success: false, error: mensaje }`.
- `Login.tsx` muestra `serverError` en banner rojo.
- `Registro.tsx` usa `toast.error` (sonner) para errores.
- `ProtectedRoute` no muestra error; solo redirige.

---

## 14. Qué NO existe

| Mecanismo | Estado |
|-----------|--------|
| Refresh token automático | No implementado; token expira → 401 → logout |
| Silent auth / check session | Solo hidratación inicial |
| MFA con app autenticadora (TOTP) | Solo OTP por email (2FA) |
| Social login Facebook / Apple | Solo Google (y roto) |
| Passwordless / magic link | No |
| Biometría / WebAuthn | No |
| Sesiones concurrentes / revocación | No UI |
| Expiración visible de token | No (frontend no decodifica JWT) |
| `next-themes` / `ThemeProvider` | Instalado, sin uso |

---

## 15. Archivos clave

| Archivo | Qué define |
|---------|------------|
| `src/features/auth/contexts/AuthContext.tsx` | Contexto completo (estado, hidratación, login, 2FA, Google, registro, reset, logout). |
| `src/features/auth/services/auth.service.ts` | Llamadas HTTP a `/auth/*` + helpers localStorage. |
| `src/features/auth/components/ProtectedRoute.tsx` | Guard principal (lógica de roles + redirecciones). |
| `src/features/auth/components/AdminRoute.tsx` | Guard solo admin. |
| `src/features/auth/components/SocialAuthButtons.tsx` | Botón Google (render manual + retry). |
| `src/features/auth/pages/Login.tsx` | UI login + RHF + Zod. |
| `src/features/auth/pages/Registro.tsx` | UI registro + RHF + Zod. |
| `src/features/auth/pages/VerificarCodigo.tsx` | UI 2FA (InputOtp). |
| `src/features/auth/pages/VerifyEmailPage.tsx` | Verificación email por token URL. |
| `src/features/auth/pages/OlvideContrasena.tsx` | Solicitud reset. |
| `src/features/auth/pages/RestablecerContrasena.tsx` | Reset con/sin token. |
| `src/features/auth/pages/AuthSuccess.tsx` | Pantalla post-Google. |
| `src/lib/api-client.ts` | Transporte HTTP + token + 401 redirect. |
| `src/lib/api-config.ts` | `AUTH_API_ROOT` base URL. |