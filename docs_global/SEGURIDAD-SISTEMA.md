# SEGURIDAD DEL SISTEMA — TurnoGo

Análisis transversal de seguridad consolidando los hallazgos documentados de ambos
repositorios. Estados por ítem: `IMPLEMENTADO` / `NO IMPLEMENTADO` / `NO DETERMINADO`.

Fuentes: `docs/AUTENTICACION.md`, `docs/AUTORIZACION.md`, `docs/SEGURIDAD.md`,
`docs/CONFIGURACION.md` (backend); `docs/AUTENTICACION.md`, `docs/SEGURIDAD.md`,
`docs/CONFIGURACION.md` (frontend).

---

## 1. Resumen ejecutivo

| Área | Estado | Severidad |
|---|---|---|
| Secretos vía entorno + `.gitignore` | IMPLEMENTADO | MEDIA |
| `SECRET_KEY` obligatoria (sin default) | IMPLEMENTADO | — |
| CORS con lista fija | IMPLEMENTADO | BAJA |
| Autenticación JWT (HS256, 60 min) | IMPLEMENTADO | — |
| Verificación de email como gate de login | IMPLEMENTADO | — |
| 2FA por OTP | IMPLEMENTADO (OTP seguro + hash + lockout; sigue no-obligatoria en `/login`) | MEDIA |
| `estado` de cuenta en login | **IMPLEMENTADO** (todos los flujos + `get_current_user`) | — |
| Autorización por rol (`role`) | PARCIAL (mutaciones de catálogo exigen `admin`; `/usuarios/admin` pendiente) | MEDIA |
| Rate limiting / brute force | **IMPLEMENTADO** (register, login, google, verify-credentials, verify-2fa, resend, forgot) | — |
| Firma del webhook de MercadoPago | **IMPLEMENTADO** (HMAC `X-Signature` v2 + anti-replay + idempotencia) | — |
| Headers de seguridad / HTTPS redirect | NO IMPLEMENTADO | MEDIA |
| RLS en Supabase | IMPLEMENTADO (catálogo público; resto denegado) | BAJA residual |
| Inyección SQL | Mitigado (ORM) | BAJA |
| Validación de inputs (Pydantic + Zod) | IMPLEMENTADO | BAJA |
| Logging/auditoría | NO IMPLEMENTADO (prints de secretos) | MEDIA |
| Endpoints de prueba/mantenimiento activos | PARCIAL (`test-email`, `/db-test`, backfills siguen; `test-geocoding` eliminado) | MEDIA |
| Almacenamiento del JWT en el cliente | `localStorage` (XSS-sensible) | MEDIA |

---

## 2. Autenticación (backend)

### 2.1 Flujos soportados

1. **Registro + verificación de email** (token `secrets.token_urlsafe(32)`, 24 h; 409 si ya existe).
2. **Login email/contraseña** (`login_user`) → JWT de 60 min; bloquea email sin verificar (403).
3. **Login con 2FA** (`verify-credentials` → `verify-2fa` / `resend-code`): OTP de 6 dígitos por
   email; "recuerdo" de 9 h (`last_2fa_verified_at`). El OTP se genera con `secrets.randbelow`,
   se almacena **hasheado** (HMAC-SHA256) y se valida con `hmac.compare_digest`; hay **lockout de
   5 intentos** (`otp_attempts`) y rate limit (10/min).
4. **Login con Google**: `id_token` verificado con `google-auth` (aud, exp, issuer); valida
   `estado` de la cuenta en ambas ramas (google_id y email).
5. **Verificación de email** (token por GET) y **reset de contraseña** (token 24 h; rechaza
   contraseña igual a la anterior).

### 2.2 Hallazgos documentados

| Hallazgo | Detalle (fuente backend) |
|---|---|
| 2FA no obligatoria en `/auth/login` | `login_user` entrega token sin OTP; el 2FA queda relegado a `/verify-credentials`. Bypass por diseño. |
| OTP seguro + hasheado ✔ | generado con `secrets.randbelow` (criptográfico); guardado como **hash HMAC-SHA256** en `usuario.otp_code`; **lockout a los 5 intentos**; rate limit 10/min en verify-2fa y resend-code. |
| Cuentas deshabilitadas ✔ | `estado` se valida en `login_user`, `verify_credentials`, `verify_2fa`, `resend_otp_code`, `login_with_google` y `get_current_user` (401 "Tu cuenta está desactivada"). |
| Sin logout/revocación | JWT sin `jti`/versión; no hay blacklist ni endpoint de logout; el token vive hasta `exp`. |
| `int(user_id)` sin validar | `sub` no numérico → `ValueError` (500) en vez de 401. |
| Registro revela existencia | 409 en `/register` antes de validar contraseña → enumeración de cuentas. |
| `detail=str(e)` | expone mensajes internos de errores de Google al cliente. |
| Logs con datos de Google | `print()` de `GOOGLE_CLIENT_ID`, prefijo del token y **payload completo del id_token**. |
| Google crea usuario con `email_verified=False` | verificación duplicada innecesaria aunque Google ya validó el email. |

### 2.3 Contradicción de `SECRET_KEY`

- `docs/AUTENTICACION.md` y `docs/SEGURIDAD.md` (backend): `SECRET_KEY` **obligatoria** — se
  eliminó el default inseguro y la app no arranca sin ella.
- `docs/USUARIOS.md` §5 (backend): menciona default `"change-this-secret-in-production"`.
  → ⚠️ **CONTRADICCIÓN DOCUMENTADA (backend interno)**; la versión actualizada
  (obligatoria) es la que reportan los docs de seguridad. Ver
  [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md) §5.

---

## 3. Autorización (backend)

| Concepto | Estado |
|---|---|
| Modelo de roles (`role`, default `"duenio"`; valores `admin`/`duenio`) | IMPLEMENTADO (modelo) |
| Uso real del `role` para decidir permisos | PARCIAL — mutaciones de catálogo (`/categorias`) exigen `role="admin"`; `/usuarios/admin` y otras mutaciones admin aún no restringidas |
| Protección por autenticación de **algunos** endpoints | IMPLEMENTADO |
| Control de propiedad (ownership/IDOR) | IMPLEMENTADO — empleados, clientes, horarios, turnos, plan/funciones, estadísticas |
| Panel/admin independiente | NO IMPLEMENTADO (`admin_router.py` no montado) |
| Gating por plan (`require_feature`) | IMPLEMENTADO (definida; sin montar en endpoints, la restricción real vive en los services) |

**Matriz de acceso verificada (backend, `docs/AUTORIZACION.md`):**

| Router | Acceso |
|---|---|
| `/auth` (register, login, google, verify-*, resend, forgot/reset, test-email) | públicos (con rate limit slowapi) |
| `/auth/me` | 🔒 `get_current_user` |
| `/usuarios` | 🔒 todos (según AUTORIZACION/CHANGELOG) — ⚠️ contradicción con ENDPOINTS/USUARIOS |
| `/negocios` (catálogo, mapa, admin, slug, backfills) | públicos |
| `/negocios` (me, POST, complete, PUT, DELETE) | 🔒; DELETE solo `admin`; PUT dueño o `admin` |
| `/turnos/por-rango` | 🔒 `get_current_negocio` (agenda del dueño) |
| `/turnos/disponibilidad` | **público** (solo slots ocupados: sin datos del cliente) |
| `/turnos` (POST) | público (booking) |
| `/turnos` (GET /, GET/{id}, PUT, DELETE, /estado) | 🔒 `get_current_negocio` + propiedad |
| `/clientes` | GET / y /{id} 🔒 (solo clientes con turnos en tus negocios); POST `/get-or-create` público |
| `/empleados` | GET / público (con `id_negocio` obligatorio); GET /{id} y POST 🔒 + propiedad |
| `/servicios` | GET público; mutaciones 🔒 con propiedad |
| `/categorias` | GET público; mutaciones 🔒 `require_role("admin")` |
| `/horarios` | GET público; POST/PUT/DELETE 🔒 + propiedad |
| `/planes` | listado público; `/negocios/{id}/funciones` 🔒 + propiedad |
| `/georef` | públicos (`test-geocoding` eliminado) |
| `/estadistica` | 🔒 `get_current_negocio` + propiedad |
| `/pagos` (crear-preferencia, suscripciones) | 🔒 `get_current_negocio` |
| `/pagos/webhook` | público, **firma HMAC validada** (`X-Signature` v2 + `x-request-id` + anti-replay) |

**Endpoints de mantenimiento expuestos (públicos):** `POST /negocios/admin/rebuild-data`,
`POST /negocios/backfill-coordenadas`, `GET /negocios/admin`, `GET /auth/test-email`,
`GET /db-test`. (Eliminado en la fase de seguridad: `GET /georef/test-geocoding`.)

---

## 4. Seguridad a nivel de datos (Supabase)

- RLS estaba habilitado sin políticas; se crearon **políticas de lectura pública** para el
  catálogo (`negocio`, `servicio`, `estado_turno`, `categorias`, `localidades`, `provincia`,
  `negocio_imagen`, `horarios_negocio`, `planes`). Migración
  `20260812120000_rls_politicas.sql`.
- Tablas sensibles (`usuarios`, `turno`, `cliente`, `empleado`, `suscripciones`,
  `plan_features`) quedan **sin políticas** → `anon`/`authenticated` no pueden leerlas vía
  PostgREST.
- La app conecta con un rol que **bypasses RLS** (postgres/service_role), por lo que las
  políticas no cambian el comportamiento de la app; recomendación: conectar con rol
  `authenticated` y vincular `usuarios.id_us` con Supabase Auth.
- Acceso a datos por SQLAlchemy ORM (parametrizado → sin inyección SQL clásica); única SQL
  cruda en el healthcheck `/db-test`.

---

## 5. Seguridad del frontend

| Aspecto | Estado documentado |
|---|---|
| Token JWT | `localStorage` (`turnexo_token`) + memoria (`ApiClient`) — expuesto a XSS si se inyecta script; sin cookies HttpOnly |
| Errores | normalizados en `ApiError`; en 401 se limpia sesión y redirige a `/login` |
| 2FA UI | `VerificarCodigo.tsx` con `InputOtp` y RHF+Zod (código de 6 dígitos) |
| Rutas protegidas | `ProtectedRoute` (dashboard) y `AdminRoute` (panel admin) por presencia de sesión |
| Google login | SDK no cargado y `VITE_GOOGLE_CLIENT_ID` ausente en `.env.local` → **el botón no funciona** en el entorno analizado |
| Validación | Zod en todos los formularios (login, registro, reset, onboarding, modales) |
| Dependencias | React 19 / Vite / RHF / Query — sin auditoría documentada de vulnerabilidades |

> El control de acceso real del panel admin depende del backend (que no valida `role` en
> `/usuarios`); la protección `AdminRoute` del frontend es solo de interfaz.

---

## 6. Terceros

| Servicio | Hallazgo |
|---|---|
| **MercadoPago** | SDK oficial; el webhook **consulta a MP** (`payment().get`) en vez de confiar en el body ✔; **valida la firma** `X-Signature` v2 (HMAC-SHA256 con el access token, `ts` con anti-replay de 5 min) ✔; **idempotencia** por `mp_payment_id` (único) y anti-replay de suscripciones activas ✔. |
| **Resend** | `except Exception: pass` silencia errores en reset-password; token/OTP generados con `secrets` (verificación/reset) ✔, OTP no criptográfico ✘. |
| **Google** | verificación estricta del `id_token` ✔; `print()` del payload completo en logs ✘. |
| **Mapbox** | token vía entorno ✔. |
| **Cloudinary** | upload **unsigned** (solo frontend) — depende de que el preset límite uso; no documentado en seguridad del backend. |

---

## 7. Riesgos priorizados (consolidado)

| # | Riesgo | Estado | Severidad |
|---|---|---|---|
| 1 | Webhook MP sin verificación de firma | IMPLEMENTADO (firma HMAC v2 + anti-replay + idempotencia) | — |
| 2 | Sin rate limiting (login, OTP, register) | IMPLEMENTADO (register 5/min, login 15/min, google 15/min, verify-credentials 15/min, verify-2fa 10/min, resend 10/min, forgot 5/min) | — |
| 3 | 2FA no obligatoria en `/auth/login` | NO implementado (bypass por diseño) | ALTA |
| 4 | OTP no criptográfico + texto plano + TTL largo + sin límite de intentos | IMPLEMENTADO (`secrets.randbelow` + hash HMAC-SHA256 + lockout 5 intentos) | — |
| 5 | Cuentas deshabilitadas siguen autenticándose (`estado`) | IMPLEMENTADO (todos los logins + `get_current_user`) | — |
| 6 | Autorización por rol inexistente + `/usuarios` admin sin restricción | PARCIAL (catálogo admin ✔; `/usuarios/admin` pendiente) | MEDIA |
| 7 | Endpoints de prueba/mantenimiento públicos (`test-email`, backfills, `/admin`) | PARCIAL (`test-geocoding` eliminado; resto pendiente) | MEDIA |
| 8 | JWT sin revocación/logout; token en `localStorage` | NO implementado | MEDIA |
| 9 | Prints de datos de Google en logs | NO implementado | MEDIA |
| 10 | Headers de seguridad/HTTPS redirect ausentes | NO implementado | MEDIA |
| 11 | RLS sin protección para la capa de app (bypass) | PARCIAL | MEDIA |
| 12 | CORS fijo y permisivo (`*`) | Implementado | BAJA |

---

## 8. Recomendaciones (orden de prioridad)

1. ✅ **Proteger el webhook de MP** — hecho: firma `X-Signature` v2 (HMAC-SHA256 + `ts` anti-replay)
   e idempotencia por `mp_payment_id`.
2. ✅ **Rate limiting** (`slowapi`) en login/verify-credentials/verify-2fa/resend-code/register/
   forgot-password — hecho.
3. 🟡 **2FA obligatoria** en `login_user` (sin bypass por diseño) — pendiente. El OTP ya es seguro:
   `secrets.randbelow`, hasheado en BD, TTL 5–10 min, lockout tras 5 intentos.
4. ✅ **Validar `estado` del usuario** en `get_current_user` y en todos los logins — hecho.
5. 🟡 **RBAC** (`require_role`) — hecho en mutaciones de catálogo (`/categorias`); proteger
   `/usuarios/admin` y el resto de mutaciones admin.
6. `jti`/`token_version` para revocación y logout.
7. Eliminar `print()` con datos de Google y `detail=str(e)`; logging estructurado; desactivar
   `/docs` y `/db-test` en producción.
8. Eliminar/proteger endpoints de mantenimiento (`rebuild-data`, `backfill-coordenadas`,
   `test-email`).
9. Migrar a **PyJWT** y revisar `passlib`/`bcrypt`; agregar `pip-audit`/Dependabot.
10. Frontend: mover el token a cookie HttpOnly o considerar storage más seguro; cargar el SDK de
    Google y definir `VITE_GOOGLE_CLIENT_ID` si se quiere el botón.

> Detalles adicionales por documento original: `docs/SEGURIDAD.md` (backend), `docs/SEGURIDAD.md`
> y `docs/AUTENTICACION.md` (frontend).