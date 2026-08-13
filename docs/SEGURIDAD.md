# Seguridad — TurnoGo Frontend

Análisis de **medidas de seguridad realmente implementadas** en el frontend.
Cada ítem se clasifica como **IMPLEMENTADO** o **NO ENCONTRADO / NO DETERMINADO**.

---

## 1. Autenticación

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| Login email/contraseña | **IMPLEMENTADO** | `POST /auth/login` → `access_token` (JWT asumido) |
| 2FA (OTP por email) | **IMPLEMENTADO** | `requires_2fa` → `/verificar-codigo` → `POST /auth/verify-2fa` |
| Google OAuth | **IMPLEMENTADO (roto)** | Botón renderizado (`SocialAuthButtons.tsx`) pero **SDK no cargado** y `VITE_GOOGLE_CLIENT_ID` ausente en `.env.local` |
| Registro | **IMPLEMENTADO** | Fuerza `role: "duenio"` en payload |
| Verificación email | **IMPLEMENTADO** | `GET /auth/verify-email/:token` → sesión |
| Recuperación contraseña | **IMPLEMENTADO** | `forgot-password` + `reset-password/:token` |
| Refresh token automático | **NO ENCONTRADO** | Token expira → 401 → logout |
| Silent auth / check session | **NO ENCONTRADO** | Solo hidratación inicial |
| MFA app (TOTP) | **NO ENCONTRADO** | Solo OTP por email |
| Social login Facebook/Apple | **NO ENCONTRADO** | Solo Google (roto) |
| Passwordless / magic link | **NO ENCONTRADO** | No |
| Biometría / WebAuthn | **NO ENCONTRADO** | No |

---

## 2. Autorización y protección de rutas

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| `ProtectedRoute` (roles) | **IMPLEMENTADO** | `src/features/auth/components/ProtectedRoute.tsx` — lógica `admin`/`duenio` + redirecciones |
| `AdminRoute` (solo admin) | **IMPLEMENTADO** | `src/features/admin/components/AdminRoute.tsx` |
| Verificación inline en páginas | **IMPLEMENTADO** | `AdminPanel.tsx`, `Dashboard.tsx` verifican rol/negocio |
| `FeatureGuard` (plan features) | **IMPLEMENTADO** | `src/features/membership/components/FeatureGuard.tsx` — `tieneFuncion(key)` |
| RBAC granular (permisos por acción) | **NO ENCONTRADO** | Solo roles `admin`/`duenio` + features por plan |
| Permisos por recurso (ownership) | **NO ENCONTRADO** | Frontend no valida ownership; confía en backend |

---

## 3. Manejo de tokens

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| JWT en memoria (`ApiClient.token`) | **IMPLEMENTADO** | `apiClient.setToken()` / `clearToken()` |
| JWT en `localStorage` (`turnexo_token`) | **IMPLEMENTADO** | Persistencia entre recargas |
| `Authorization: Bearer` header | **IMPLEMENTADO** | Inyectado por `ApiClient.buildHeaders()` |
| `omitAuth` / `skipAuthRedirect` | **IMPLEMENTADO** | Usado en endpoints de auth |
| 401 → limpieza + redirect `/login` | **IMPLEMENTADO** | `ApiClient.request()` línea 125-128 |
| Token en cookies / HttpOnly | **NO ENCONTRADO** | Solo memoria + localStorage |
| Refresh token / rotación | **NO ENCONTRADO** | No |
| Token en URL / query param | **NO ENCONTRADO** | Solo en `VerifyEmailPage` (`/verify-email/:token`) |
| Expiración visible / countdown | **NO ENCONTRADO** | Frontend no decodifica JWT |
| Almacenamiento seguro (IndexedDB cifrado) | **NO ENCONTRADO** | Solo `localStorage` plano |

---

## 4. Validación (cliente)

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| Zod schemas en formularios | **IMPLEMENTADO** | `Login`, `Registro`, `RestablecerContrasena`, `VerificarCodigo`, `RegistrarNegocio` (schema.tsx) |
| React Hook Form + `zodResolver` | **IMPLEMENTADO** | Validación en cliente antes de submit |
| Validación por paso (wizard) | **IMPLEMENTADO** | `RegistrarNegocio` usa `trigger(fieldsPerStep[step])` |
| Sanitización de inputs (trim, etc.) | **IMPLEMENTADO PARCIAL** | Servicios normalizan (`trim`, `Number`, `Boolean`) en services |
| Validación de archivo (imagen) | **IMPLEMENTADO** | `image-upload.tsx`: `image/*`, max 5MB, type check |
| Rate limiting / throttling cliente | **NO ENCONTRADO** | No |
| CAPTCHA / honeypot | **NO ENCONTRADO** | No |
| Validación de contenido HTML/XSS en inputs ricos | **NO ENCONTRADO** | No hay inputs ricos (solo text/plain) |

---

## 5. Variables de entorno y secretos

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| `.env.local` gitignoreado | **IMPLEMENTADO** | `.gitignore` incluye `.env` y `*.local` |
| Prefijo `VITE_` para variables cliente | **IMPLEMENTADO** | `VITE_API_URL`, `VITE_MAPBOX_TOKEN`, etc. |
| Secrets en código / repo | **NO ENCONTRADO** | No hay secrets hardcodeados en `src/` |
| `VITE_GOOGLE_CLIENT_ID` presente | **NO ENCONTRADO** | Referenciado en código pero **ausente en `.env.local`** |
| Rotación de claves / key management | **NO ENCONTRADO** | No automatizado |

---

## 6. Exposición de información

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| Errores de backend mostrados al usuario | **IMPLEMENTADO PARCIAL** | `getApiErrorMessage` extrae `detail`; `toast.error` o banners inline |
| Stack traces en producción | **NO ENCONTRADO** | Solo `console.error` en catch; `ErrorBoundary` muestra mensaje genérico |
| Información de versión / build expuesta | **NO ENCONTRADO** | No hay `/version` endpoint ni build info en UI |
| Datos sensibles en logs de consola | **IMPLEMENTADO PARCIAL** | `console.error("API ERROR [METHOD URL]:", error)` — incluye error completo |
| PII en localStorage | **IMPLEMENTADO** | `turnexo_user` (email, nombre, id, negocio) + `turnexo_token` (JWT) en texto plano |
| Source maps en producción | **NO DETERMINADO** | Config Vite por defecto genera sourcemaps; `vercel.json` no los deshabilita |

---

## 7. CORS y comunicación cross-origin

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| CORS configurado en frontend | **NO APLICA** | CORS es responsabilidad del backend; frontend solo hace `fetch` |
| `credentials: include` en fetch | **NO ENCONTRADO** | `ApiClient` no usa `credentials`; auth por header |
| `Content-Type` correcto (JSON/FormData) | **IMPLEMENTADO** | `ApiClient.buildHeaders` omite `Content-Type` para `FormData` |
| Subida directa a Cloudinary (CORS externo) | **IMPLEMENTADO** | `image-upload.tsx` → `fetch("https://api.cloudinary.com/...")` |
| Redirect a Mercado Pago (cross-origin) | **IMPLEMENTADO** | `window.location.href = init_point` (full redirect) |

---

## 8. Protección contra ataques comunes

| Ataque | Mitigación | Estado |
|--------|------------|--------|
| XSS (React) | Escape automático JSX | **IMPLEMENTADO** (por React) |
| CSRF | No usa cookies → no vulnerable | **NO APLICA** (auth por header) |
| Clickjacking | No headers `X-Frame-Options` en frontend | **NO ENCONTRADO** (responsabilidad backend/CDN) |
| MIME sniffing | No headers en frontend | **NO ENCONTRADO** |
| CSP (Content Security Policy) | **NO ENCONTRADO** | No `meta http-equiv` en `index.html` ni header en Vercel |
| HSTS | **NO ENCONTRADO** | Responsabilidad backend/CDN |
| Subresource Integrity (SRI) | **NO ENCONTRADO** | No en `index.html` |
| Dependency scanning / audit | **NO ENCONTRADO** | No `npm audit` en CI visible |

---

## 9. Almacenamiento en cliente

| Dato | Dónde | Seguridad |
|------|-------|-----------|
| JWT (`turnexo_token`) | `localStorage` | Texto plano, accesible por XSS |
| Usuario (`turnexo_user`) | `localStorage` | Texto plano (email, nombre, id, negocio) |
| 2FA pendiente (`turnexo_pending_2fa_email`) | `localStorage` | Texto plano |
| React Query cache | Memoria (JS) | Se pierde al recargar |
| IndexedDB / cookies | No usado | — |

---

## 10. Comunicación con backend

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| HTTPS en producción | **NO DETERMINADO** | `VITE_API_URL` configurable; Vercel fuerza HTTPS |
| Validación de certificado TLS | **IMPLEMENTADO** | `fetch` nativo valida certs |
| Certificate pinning | **NO ENCONTRADO** | No |
| Request signing / HMAC | **NO ENCONTRADO** | No |
| Idempotency keys | **NO ENCONTRADO** | No |

---

## 11. Dependencias con vulnerabilidades conocidas

| Herramienta | Estado |
|-------------|--------|
| `npm audit` / `pnpm audit` | **NO EJECUTADO EN CI VISIBLE** |
| `dependabot` / `renovate` | **NO CONFIGURADO VISIBLE** |
| `package-lock` / `pnpm-lock` | **PRESENTE** (`pnpm-lock.yaml`) |

---

## 12. Resumen: Implementado vs No encontrado

| Categoría | Implementado | No encontrado / No determinado |
|-----------|--------------|--------------------------------|
| **Auth** | Login, 2FA email, registro, verif. email, reset pass, Google (roto) | Refresh token, silent auth, TOTP, social FB/Apple, passwordless, WebAuthn |
| **Autorización** | `ProtectedRoute`, `AdminRoute`, `FeatureGuard`, roles `admin`/`duenio` | RBAC granular, ownership checks |
| **Tokens** | JWT en memoria + localStorage, Bearer header, 401→logout | Refresh token, cookies HttpOnly, token expiry UI, almacenamiento cifrado |
| **Validación** | Zod + RHF, validación por paso, sanitización services, file validation | Rate limiting, CAPTCHA, XSS en rich text |
| **Env/Secrets** | `.env.local` gitignoreado, prefix `VITE_`, no secrets en código | `VITE_GOOGLE_CLIENT_ID` ausente, rotación de claves |
| **Exposición info** | Errores amigables, ErrorBoundary, console.error con detalle | Stack traces prod, PII en localStorage plano, source maps prod |
| **CORS/Comunicación** | Fetch con header Auth, subida Cloudinary, redirect MP | CORS backend, CSP, HSTS, SRI, cookie credentials |
| **Ataques comunes** | XSS (React), CSRF (no cookies) | CSP, X-Frame-Options, Clickjacking, MIME sniffing, dependency audit |
| **Almacenamiento** | JWT + user + 2FA en localStorage plano | IndexedDB cifrado, cookies seguras |
| **Backend comm** | HTTPS configurable, fetch valida TLS | Cert pinning, request signing, idempotency |
| **Deps** | Lockfile presente | Audit CI, dependabot |

---

## 13. Archivos clave de seguridad

| Archivo | Qué implementa |
|---------|----------------|
| `src/features/auth/contexts/AuthContext.tsx` | Login, 2FA, Google, registro, reset, logout, hidratación, tokens |
| `src/features/auth/services/auth.service.ts` | Endpoints `/auth/*` + helpers localStorage |
| `src/features/auth/components/ProtectedRoute.tsx` | Guard rutas + lógica roles |
| `src/features/auth/components/AdminRoute.tsx` | Guard solo admin |
| `src/features/membership/components/FeatureGuard.tsx` | Gating por plan |
| `src/lib/api-client.ts` | Transporte HTTP + token + 401→logout |
| `src/lib/api-error.ts` | Normalización errores |
| `src/components/error-boundary.tsx` | ErrorBoundary UI |
| `src/components/ui/image-upload.tsx` | Validación archivo (tipo, tamaño) |
| `src/components/NavLink.tsx` | NavLink seguro (active/pending) |
| `.gitignore` | Ignora `.env`, `*.local`, `dist/`, logs |
| `vercel.json` | SPA rewrite (no seguridad per se) |

---

> **Nota**: Este documento describe **solo lo que existe en el código frontend**. La seguridad completa del sistema depende críticamente del backend (validación, rate limiting, CORS, CSP, HSTS, sanitización, encriptación, auditoría, etc.) que no se analiza aquí.