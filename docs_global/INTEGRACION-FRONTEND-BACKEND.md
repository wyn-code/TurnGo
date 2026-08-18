# INTEGRACIÓN FRONTEND ↔ BACKEND — TurnoGo

Contrato de integración entre la SPA React (`Turnexo_front`) y la API FastAPI (`Turnexo`):
cómo se conectan, qué endpoints consume el frontend, qué expone el backend y —lo más
importante— las **discrepancias** entre ambas caras del contrato.

Fuentes: `docs/API_CLIENT.md`, `docs/API_CONFIG.md`→`docs/CONFIGURACION.md`,
`docs/ESTADO_Y_DATOS.md`, `docs/FLUJO_DATOS.md`, `docs/PAGOS.md` (frontend);
`docs/API.md`, `docs/ENDPOINTS.md`, `docs/RESERVAS.md` (backend).

---

## 1. Cómo se conectan

- **Base de la API (frontend, `src/lib/api-config.ts`):**
  `API_HOST = VITE_API_URL || "http://localhost:8000"` →
  `API_BASE_URL = `${API_HOST}/api``.
- **Transporte:** `ApiClient` (singleton, `src/lib/api-client.ts`) basado en `fetch`.
  - `ApiClient.request(path, options)` agrega `Authorization: Bearer <token>` cuando hay token
    en memoria y serializa JSON.
  - `ApiClient.setToken(token)` / `clearToken()` lo conectan con `AuthContext`.
  - Errores normalizados en `ApiError` (`status`, `detail`, `title`); en 401 limpia sesión y
    redirige al login.
- **Autenticación de los endpoints protegidos (backend):** dependencias
  `get_current_user`, `get_current_negocio`, `require_feature` y comparaciones de propiedad en
  línea.

> ⚠️ **CONTRADICCIÓN DOCUMENTADA (frontend interno):** `src/lib/api-config.ts` contiene un
> objeto de endpoints **legado en inglés** (`/businesses`, `/services`, `/professionals`,
> `/schedules`, `/appointments`, …) que **no coincide** con los endpoints realmente usados por
> los services ni con los routers del backend (nombres en español). Ese objeto no se usa en los
> services documentados; es código muerto/heredado. Detalle en §8.

---

## 2. Mapa de servicios del frontend → endpoints consumidos

| Service del frontend | Endpoints que consume | Backend lo expone | Auth backend |
|---|---|---|---|
| `business.service.ts` | `GET /negocios/`, `GET /negocios/mapa`, `GET /negocios/me`, `GET /negocios/slug/:slug`, `GET /negocios/admin`, `POST /negocios/`, `PUT /negocios/:id`, `DELETE /negocios/:id` | ✔ todos | GET públicos; POST/PUT/DELETE con `get_current_user`; DELETE exige `role="admin"` |
| `servicio.service.ts` | `GET /servicios/?id_negocio=`, `POST /servicios/`, `PUT /servicios/:id`, `PATCH /servicios/:id`, `DELETE /servicios/:id` | ✔ todos | GET público; mutaciones con `get_current_user` + propiedad |
| `empleado.service.ts` | `GET /empleados/?id_negocio=`, `POST /empleados/`, `PUT /empleados/:id`, `PATCH /empleados/:id`, `DELETE /empleados/:id` | ❌ **solo GET y POST** (ver §4) | GET / público (con `id_negocio`); GET /{id} y POST 🔒 + propiedad |
| `horario.service.ts` | `GET /horarios/:id`, `POST /horarios/:id`, `PUT /horarios/:id`, `DELETE /horarios/:id` | ✔ (path = `id_negocio`) | GET público; mutaciones 🔒 + propiedad |
| `cliente.service.ts` | `POST /clientes/get-or-create` | ✔ | público |
| `appointment.service.ts` | `GET /turnos/disponibilidad`, `GET /turnos/por-rango`, `POST /turnos/`, `PUT /turnos/:id/estado`, `GET /turnos/:id`, `PUT /turnos/:id`, `DELETE /turnos/:id` | ✔ todos | `disponibilidad` público (solo slots, sin cliente); `por-rango` 🔒 `get_current_negocio`; CRUD/estado 🔒 + propiedad; `POST /turnos/` público |
| `membership.service.ts` | `GET /planes/`, `GET /planes/negocios/:id/funciones`, `GET /pagos/suscripcion/actual`, `POST /pagos/crear-preferencia`, `POST /pagos/suscripcion/:id/cancelar`, `PUT /pagos/suscripcion/:id/renovacion-automatica` | ✔ todos | `GET /planes/` público; `/funciones` 🔒 + propiedad; pagos con `get_current_negocio` |
| `user.service.ts` | `GET /usuarios/`, `GET /usuarios/admin`, `PUT /usuarios/:id`, `PATCH /usuarios/:id/estado`, `DELETE /usuarios/:id` | ✔ todos | ver §4 (discrepancia de auth) |
| `estadistica.service.ts` | `GET /statistics/business/:id` | ✔ | `get_current_negocio` + propiedad |
| `georef.service.ts` | `GET /georef/provincias`, `GET /georef/localidades` | ✔ | públicos (`test-geocoding` eliminado) |
| `authService` | `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `GET /auth/me`, `POST /auth/verify-credentials`, `POST /auth/verify-2fa`, `POST /auth/resend-code`, `POST /auth/forgot-password`, `POST /auth/reset-password/:token`, `GET /auth/verify-email/:token` | ✔ todos | `/auth/me` protegido; resto público (con rate limit) |

---

## 3. Nombres de rutas frontend → datos requeridos

| Ruta frontend | Servicios/endpoints usados | Actor |
|---|---|---|
| `/` (Index) | `useBusinesses`, `useCategories`, `/negocios/mapa` | público |
| `/negocios` | `GET /negocios/`, `GET /categorias/`, georef | público |
| `/negocio/:slug` | `GET /negocios/slug/:slug`, `GET /servicios/?id_negocio=`, `GET /empleados/?id_negocio=` | público |
| `/reservar/:slug` | negocio + servicios + empleados + `GET /turnos/disponibilidad` (slots ocupados, público) + `GET /horarios/:id` + `POST /clientes/get-or-create` + `POST /turnos/` | público |
| `/login`, `/registro` | `authService` | público |
| `/verificar-codigo` | `verify-2fa`, `resend-code` | público |
| `/registrar-negocio` | `POST /negocios/` | dueño |
| `/planes`, `/mi-suscripcion`, `/pagos/resultado` | planes, pagos, suscripción | dueño |
| `/dashboard/*` | `GET /negocios/me`, `por-rango`, servicios, empleados, horarios, `statistics`, pagos | dueño |
| `/admin/*` | `GET /negocios/admin`, `GET /usuarios/`, `GET /usuarios/admin`, PUT/PATCH/DELETE | admin |

---

## 4. Discrepancias de endpoints (frontend pide algo que el backend no tiene)

### 4.1 Empleados: PUT/PATCH/DELETE faltan en el backend

- **Frontend** (`docs/ESTADO_Y_DATOS.md`, `hooks/mutations/useEmployeeService.ts` → `empleado.service.ts`)
  consume `PUT /empleados/:id`, `PATCH /empleados/:id` y `DELETE /empleados/:id`
  (`useUpdateEmployee`, `useToggleEmployee`).
- **Backend** (`docs/API.md` §5.1 y `docs/ENDPOINTS.md` §6): el router `/empleados` solo define
  `GET /`, `GET /{empleado_id}` y `POST /`.

> **Conclusión documentada:** las mutaciones de edición/activación/eliminación de empleados del
> frontend apuntan a endpoints que **no existen** en el backend. Los empleados solo pueden
> listarse y crearse. Esta es la brecha de integración más evidente del contrato.

### 4.2 Usuarios: discrepancia de autenticación

- **Backend — docs que dicen "público":** `docs/ENDPOINTS.md` §3 y `docs/USUARIOS.md` §3
  documentan `/api/usuarios/*` **sin autenticación** (solo `get_db`).
- **Backend — docs que dicen "protegido":** `docs/AUTORIZACION.md` §4.1 y `docs/CHANGELOG.md`
  (Fase 6, 12/08/2026) documentan que **todos** los endpoints de `/api/usuarios` fueron
  corregidos para exigir `get_current_user`, y que aún no se restringe `/admin` ni las
  mutaciones a `role="admin"`.

> ⚠️ **CONTRADICCIÓN DOCUMENTADA (backend interno).** El frontend llama a `/usuarios/*` desde
> el panel admin (`user.service.ts`) sin dependencias especiales; depende de cuál sea el estado
> real del router (ver [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md) §5).

### 4.3 Turnos: discrepancia de autenticación en CRUD

- **Backend — docs que dicen "público":** `docs/ENDPOINTS.md` §9 y `docs/RESERVAS.md` §2
  documentan `GET /api/turnos/`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` **sin autenticación**
  (solo `/estado` exige `get_current_negocio`).
- **Backend — docs que dicen "protegido":** `docs/AUTORIZACION.md` §4.2 y `docs/CHANGELOG.md`
  (Fase 6, 12/08/2026) documentan que fueron **corregidos** para exigir `get_current_negocio` +
  verificación de que el turno pertenezca al negocio del token (404 si no). `GET /por-rango` y
  `POST /` seguían públicos por diseño (booking).

> ⚠️ **CONTRADICCIÓN DOCUMENTADA (backend interno).** Afecta el uso de
> `getAppointmentById`/`updateAppointment`/`deleteAppointment` del frontend
> (`appointment.service.ts`), que en las páginas documentadas **no se invoca** (la agenda usa
> `por-rango` + `/estado`; ver `docs/API_CLIENT.md` y `docs/ESTADO_Y_DATOS.md`). Ver
> [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md) §5.

> **Resuelto en la fase de seguridad (18/08/2026):** el CRUD de `/turnos` quedó protegido con
> `get_current_negocio` + propiedad. `GET /turnos/por-rango` pasó a exigir auth (agenda del
> dueño) y la reserva pública usa el nuevo `GET /turnos/disponibilidad` (público, solo slots
> ocupados **sin datos del cliente**). `POST /turnos/` (booking) sigue público.

### 4.4 Horarios: la semántica del path es `id_negocio`

El frontend llama `GET /horarios/:id` con el `businessId` del negocio. El backend interpreta
el path como **`id_negocio`** (no un id de franja). Es **coherente**, pero conviene documentarlo
porque `horario.service.ts` usa el mismo id para crear/actualizar/eliminar el set completo de
franjas (el PUT reemplaza todas).

---

## 5. Discrepancia de la 2FA en el flujo de login

- **Frontend** (`docs/ESTADO_Y_DATOS.md` §4.1): el login hace `POST /auth/login` y, **si la
  respuesta incluye `requires_2fa`**, guarda `turnexo_pending_2fa_email` y redirige a
  `/verificar-codigo` (que usa `verify-credentials`/`verify-2fa`).
- **Backend** (`docs/AUTENTICACION.md` §3 y `docs/USUARIOS.md` §7): `POST /auth/login`
  (`login_user`) **no exige 2FA** y devuelve directamente un `access_token` de 60 min. El flujo
  OTP existe en `/verify-credentials` → `/verify-2fa`.

> ⚠️ **CONTRADICCIÓN DOCUMENTADA (frontera).** Según los documentos, el backend soporta ambos
> caminos (login directo + verify-credentials/2FA), y el frontend implementa ambos; la diferencia
> está en que el backend no documenta que `/auth/login` responda `requires_2fa`. Para la tesis
> conviene verificar el código real de `auth_service.login_user` para confirmar cuál es el
> comportamiento efectivo del endpoint (ver [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md)
> §5, ítem F-3).

> **Verificado (18/08/2026):** `login_user` devuelve `(usuario, token)`; si la 2FA se verificó
> recientemente (`last_2fa_verified_at` < 9 h) devuelve el `access_token`; si no, devuelve
> `token=None` y `/auth/login` responde `{"requires_2fa": true, "email": ...}`. El frontend
> (`VerificarCodigo.tsx`) consume correctamente ese contrato.

---

## 6. Integraciones de terceros por lado

| Integración | Lado | Documentado en |
|---|---|---|
| Mapbox GL (mapa) | Frontend | `Map.tsx`, `docs/COMPONENTES.md`, `docs/CONFIGURACION.md` |
| Cloudinary (imágenes) | Frontend | `image-upload.tsx`, `docs/CONFIGURACION.md` |
| Google Identity (botón) | Frontend | `SocialAuthButtons.tsx` — SDK no cargado / sin `VITE_GOOGLE_CLIENT_ID` en `.env.local` |
| MercadoPago SDK (público) | Frontend | `src/lib/mercadopago.ts`, `docs/PAGOS.md` |
| Resend (emails) | Backend | `email_service.py`, `docs/EMAILS.md` |
| MercadoPago (pagos/webhook) | Backend | `payment_service.py`, `docs/PAGOS.md` |
| Mapbox (geocoding) | Backend | `mapbox_service.py` |
| Google OAuth (validación id_token) | Backend | `auth_service.py` |

---

## 7. Formato de respuesta y errores (contrato)

| Aspecto | Valor |
|---|---|
| Formato de éxito | JSON de los `response_model` Pydantic |
| Formato de error (backend) | `{ "detail": "<mensaje>" }` (excepciones: DELETE 204, `{"mensaje": ...}`) |
| Errores mapeados por ApiClient | `ApiError { status, detail, title }`; 401 → limpiar sesión → `/login` |
| Códigos usados | 200, 201, 204, 400, 401, 403, 404, 409, 422, 500, 502 |
| Auth header | `Authorization: Bearer <jwt>` |

---

## 8. Detalle del código legado en `api-config.ts` (frontend)

`src/lib/api-config.ts` define (además de las bases) un objeto `endpoints` con rutas en inglés
que **no** se utilizan en los services documentados:

| Objeto legado | Endpoint real usado por services | Backend expone |
|---|---|---|
| `/businesses` | `/negocios` | ✔ `/negocios` |
| `/services` | `/servicios` | ✔ `/servicios` |
| `/professionals` | `/empleados` | ✔ `/empleados` |
| `/schedules` | `/horarios/{id_negocio}` | ✔ `/horarios` |
| `/appointments` | `/turnos` | ✔ `/turnos` |

> Conclusión: el frontend convivió con dos convenciones de nombres. Los **services** usan la
> versión en español (coherente con el backend); el objeto en inglés es código muerto que
> debería eliminarse para la entrega de la tesis.

---

## 9. Resumen de brechas para la integración

| # | Brecha | Lado afectado | Severidad |
|---|---|---:|---|
| 1 | PUT/PATCH/DELETE `/empleados/:id` no existen en backend | Frontend (muta) → 404/405 | Alta |
| 2 | ~~Auth de `/usuarios/*` y CRUD `/turnos/*` documentada de forma contradictoria~~ | Integración + seguridad | **Resuelto** (CRUD turnos protegido; por-rango 🔒 + disponibilidad público) |
| 3 | ~~`/auth/login` sin 2FA documentado vs. frontend que espera `requires_2fa`~~ | Flujo de login | **Verificado** (responde `requires_2fa`; frontend lo consume) |
| 4 | Objeto de endpoints legado en inglés en `api-config.ts` | Higiene del código | Baja |
| 5 | Google login: falta `VITE_GOOGLE_CLIENT_ID` y SDK no cargado | Botón de Google | Media |
| 6 | `GET /turnos/por-rango` exige auth (cambio de seguridad) → la reserva pública usa `/turnos/disponibilidad` | Integración | Resuelto en la fase de seguridad |