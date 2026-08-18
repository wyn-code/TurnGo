# FLUJOS END-TO-END — TurnoGo

Recorridos completos usuario-sistema que cruzan frontend (`Turnexo_front`) y backend
(`Turnexo`). Cada flujo indica la ruta/servicio del frontend, los endpoints consumidos y la
lógica del backend que los respalda, tal como se documenta en cada repositorio.

Fuentes: `docs/ROUTING.md`, `docs/FLUJO_DATOS.md`, `docs/ESTADO_Y_DATOS.md`,
`docs/API_CLIENT.md`, `docs/AUTENTICACION.md`, `docs/PAGOS.md` (frontend) y
`docs/AUTENTICACION.md`, `docs/USUARIOS.md`, `docs/NEGOCIOS.md`, `docs/RESERVAS.md`,
`docs/ESTADOS_TURNO.md`, `docs/PAGOS.md`, `docs/EMAILS.md` (backend).

---

## 1. Flujo 1 — Registro de cuenta y verificación de email

```
Frontend (Registro.tsx → authService.register)          Backend
   POST /api/auth/register {usuario_us, email_us,       → auth_service.register_user
                            contrasena_us, nombre,         · 409 si email o usuario ya existen
                            apellido}                      · valida PASSWORD_REGEX (12-16, mayúscula,
                                                            minúscula, número, especial)
                                                            · hash bcrypt
                                                            · email_verified=False + token 24 h
                                                            · envía email de verificación (Resend)
   ← 200 {usuario, ...}
   → navega a Login (mensaje "revisá tu email")

Cliente hace clic en el enlace del email:
   GET {FRONTEND_URL}/verify-email/{token}              → GET /api/auth/verify-email/{token}
                                                          · valida token + expiración (24 h)
                                                          · email_verified=True
                                                          · emite access_token (en el cuerpo)
   ← redirige a AuthSuccess / login
```

**Observaciones (documentadas en backend `docs/AUTENTICACION.md`):**
- El flujo de verificación responde "Token inválido" vs "Token expirado" (permite inferir la
  validez de un token).
- El token viaja por GET (puede quedar en logs de proxy/navegador).

---

## 2. Flujo 2 — Inicio de sesión (email/contraseña + 2FA)

> ⚠️ **CONTRADICCIÓN DOCUMENTADA — 2FA:** el backend (`docs/AUTENTICACION.md` §3) documenta
> que `POST /api/auth/login` (función `login_user`) **no exige 2FA** y entrega un JWT de
> 60 min directamente. El frontend (`docs/ESTADO_Y_DATOS.md` §4.1 y `docs/AUTENTICACION.md`)
> documenta un flujo de login que contempla `requires_2fa` y la redirección a
> `/verificar-codigo` (flujo `verify-credentials` → `verify-2fa`). Ver
> [INTEGRACION-FRONTEND-BACKEND.md](./INTEGRACION-FRONTEND-BACKEND.md) §6.
> **Verificado (18/08/2026):** `login_user` devuelve token si la 2FA es reciente (< 9 h); si no,
> responde `requires_2fa`; el frontend consume ese contrato.

```
Opción A — Login directo:
   POST /api/auth/login {email_us: email|usuario, contrasena_us}
     → 401 "Credenciales invalidas" | 403 si email sin verificar | 401 si cuenta desactivada
     → 200 {access_token (60 min), ...} → AuthContext.applySessionFromToken
       → localStorage (turnexo_token, turnexo_user) + apiClient.setToken
       → GET /api/auth/me → /dashboard

Opción B — Login con 2FA (flujo verify-credentials):
   POST /api/auth/verify-credentials {email_us, contrasena_us}
     · valida credenciales + email_verified + estado
     · si last_2fa_verified_at < 9 h  → emite token directo
     · si no → genera OTP 6 dígitos (secrets) → persiste HASH (otp_code) → envía email
   → requires_2fa=true → frontend guarda turnexo_pending_2fa_email → /verificar-codigo
   POST /api/auth/verify-2fa {email_us, otp_code(6)}
     · 401 si usuario no existe / OTP expirada / código incorrecto; lockout a los 5 intentos
     · limpia OTP, setea last_2fa_verified_at → access_token (9 h)
   ← AuthContext.applySessionFromToken → /dashboard
   (POST /api/auth/resend-code → reenvía OTP)
```

**Observaciones de seguridad (backend `docs/AUTENTICACION.md`):**
- `estado` (bool) **sí** se valida en `login_user`, `verify_credentials`, `verify_2fa`,
  `resend_otp_code`, `login_with_google` y `get_current_user` (401 "Tu cuenta está desactivada").
- OTP: generado con `secrets.randbelow` (criptográfico), guardado como **hash HMAC-SHA256**,
  con **lockout a los 5 intentos** y rate limit (10/min). Pendiente: 2FA obligatoria en `/login`.
- No hay logout/revocación de JWT.

---

## 3. Flujo 3 — Onboarding del dueño: registro de negocio

```
Frontend (RegistrarNegocio.tsx, wizard 7 pasos, RHF+Zod)     Backend
   · paso 7 → mapper.ts → CreateCompleteBusinessRequest
   POST /api/negocios/ (NegocioCompleteCreate)               → negocio_service.crear_negocio_completo
     · nombre, id_categoria, wsp, direccion, ciudad (+        · 400 si falta usuario/categoría/
       id_localidad, id_provincia, ig_url, logo, descripcion)   localidad/provincia inválida
     · imagenes[], servicios[], empleados[], horarios[]        · geocodifica con Mapbox (fallo silencioso)
                                                               · genera slug único
                                                               · transacción atómica: Negocio + imágenes
                                                                 (portada = índice 0) + servicios +
                                                                 empleados + horarios (1 commit)
   ← 201 NegocioCompleteResponse → SuccessView → /dashboard
```

**Observaciones:**
- `POST /api/negocios/` exige autenticación (`get_current_user`) y fija
  `usuario_id = current_user.id_us` (relación 1:1 usuario↔negocio por `usuario_id` UNIQUE).
- `POST /api/negocios/complete` es un alias oculto de OpenAPI (`include_in_schema=False`).
- Imágenes subidas desde el frontend a Cloudinary (unsigned preset) antes del POST.

---

## 4. Flujo 4 — Reserva de turno (cliente final, sin login)

```
Frontend (Reservar.tsx, wizard 4 pasos)                     Backend
   paso 1-2: elige servicio (ServiceCard), profesional
             (ProfessionalCard) y fecha/hora
· disponibilidad calculada client-side con:
        GET /api/turnos/disponibilidad?id_negocio&desde&hasta → turnos ocupados que solapan el
          (&id_empleado opcional)                              rango (público; solo slots, sin
                                                                datos del cliente)
        GET /api/horarios/{id_negocio}                       → franjas de atención
        GET /api/servicios/?id_negocio=                      → servicios
        GET /api/empleados/?id_negocio=                      → empleados
   paso 3: BookingForm (datos del cliente) → clienteService
       POST /api/clientes/get-or-create                     → normaliza teléfono (≥8 dígitos),
                                                              get-or-create por teléfono UNIQUE
   paso 4: crear turno
       POST /api/turnos/ {id_negocio, id_cliente,           → turno_service.crear_turno
                          id_servicio, fecha_hora_inicio,     1. servicio activo + negocio activo (404)
                          id_empleado?}                       2. límite plan Free (10 turnos/día, 403)
                                                               3. fecha_hora_fin = inicio + duracion_min
                                                               4. rango válido (400)
                                                               5. empleado del negocio (400)
                                                               6. dentro del horario (400)
                                                               7. sin solapamiento (409; + GiST)
                                                               8. cliente existe (404)
                                                               9. estado inicial = CONFIRMADO
                                                              10. email confirmación + QR (background)
   ← 201 TurnoResponse
   → BookingSummary muestra QR (QRCodeSVG con deep-link
     /dashboard/turnos?turno={id}) + Google Calendar
```

**Observaciones (backend `docs/RESERVAS.md`):**
- El estado inicial **siempre** es `CONFIRMADO` (no existe `PENDIENTE` asignado; el campo
  `servicio.requiere_aprobacion` no condiciona nada).
- Los turnos `CANCELADO` **cuentan** para la verificación de solapamiento (no se filtran por
  estado).
- Email de confirmación solo si el cliente tiene `email`; fallo de Resend no afecta al turno
  (best-effort, background).
- No existe endpoint de "slots disponibles": el backend solo devuelve turnos ocupados
  (`disponibilidad`, público) y franjas (`horarios`); la lógica de slots es del frontend.
  (`GET /api/turnos/por-rango` quedó restringido a la agenda del dueño.)

---

## 5. Flujo 5 — Gestión del turno por el dueño (agenda + estados)

```
Frontend (DashboardTurnos.tsx)                              Backend
   GET /api/negocios/me                                     → negocio del usuario (get_current_user)
   GET /api/turnos/por-rango (rango del día/semana)         → agenda del negocio
   · vista Hoy / Semana; highlight por QR (?turno=id)
   · cambiar estado (statusMutation):
       PUT /api/turnos/{id}/estado {id_estado,              → turno_service.cambiar_estado_turno
                                      rechazado_motivo?}      · auth get_current_negocio
                                                              · 403 si el turno no es del negocio
                                                              · valida transición (máquina de estados)
                                                              · CANCELADO → rechazado_motivo obligatorio
                                                                (mín. 5, máx. 500)
                                                              · email de cancelación en background
   → invalidateQueries(["appointments"])
   · borrar/editar (getAppointmentById/update/delete usan
     GET/PUT/DELETE /api/turnos/{id})  ← ver §Observación
```

**Máquina de estados (backend `docs/ESTADOS_TURNO.md`):**

| Desde | Hacia |
|---|---|
| PENDIENTE (1) | CONFIRMADO (2), CANCELADO (4) — definida en la máquina, **no usada hoy** |
| CONFIRMADO (2) | COMPLETADO (3), CANCELADO (4), NO_ASISTIO (5) |
| COMPLETADO (3) | terminal |
| CANCELADO (4) | terminal (irreversible) |
| NO_ASISTIO (5) | terminal |

> ⚠️ **CONTRADICCIÓN DOCUMENTADA (backend interno):** `docs/ENDPOINTS.md` y `docs/RESERVAS.md`
> documentan `GET /api/turnos/`, `GET /{id}`, `PUT /{id}` y `DELETE /{id}` como **públicos**,
> mientras `docs/AUTORIZACION.md` §4.2 y `docs/CHANGELOG.md` (Fase 6) documentan que fueron
> **corregidos** (12/08/2026) para exigir `get_current_negocio` + verificación de propiedad.
> Ver [INTEGRACION-FRONTEND-BACKEND.md](./INTEGRACION-FRONTEND-BACKEND.md) §5.

---

## 6. Flujo 6 — Suscripción y pago (Mercado Pago)

```
Frontend (Planes.tsx → useCrearPreferencia)                Backend
   GET /api/planes/                                         → lista de planes activos
   POST /api/pagos/crear-preferencia {id_plan}              → payment_service.crear_preferencia_mp
                                                             · auth get_current_negocio
                                                             · 404 si plan inactivo
                                                             · cancela suscripciones "pendiente" previas
                                                             · SDK preference().create(...)
                                                               items (plan, ARS), back_urls → FRONTEND_URL
                                                               /pagos/resultado, notification_url →
                                                               BACKEND_URL/api/pagos/webhook,
                                                               external_reference = "id_negocio:id_plan",
                                                               date_of_expiration = +24 h
                                                             · persiste Suscripcion "pendiente"
   ← {init_point (o sandbox_init_point si token TEST-),
      preference_id}
   → redirige a init_point (Checkout Pro)
   MercadoPago: cliente paga → redirige a /pagos/resultado (success/failure/pending)
                y envía webhook:
POST /api/pagos/webhook  (form: topic, id; headers       → valida firma `X-Signature` v2
                              x-signature + x-request-id)      (HMAC-SHA256 + ts anti-replay; 401 si
                                                                inválida) → si topic=payment y
                                                                status=approved
                                                               · parsea external_reference
                                                               · procesar_pago_exitoso → única
                                                                 suscripción activa (cancela otras
                                                                 pendientes/activas)
                                                               · idempotencia por mp_payment_id
    ← {"status":"ok"} (200)
Frontend (MiSuscripcion.tsx):
   GET /api/pagos/suscripcion/actual                        → suscripción más reciente (cualquier estado)
   POST /api/pagos/suscripcion/{id}/cancelar                → marca cancelada (solo activa/pendiente)
   PUT  /api/pagos/suscripcion/{id}/renovacion-automatica   → setea booleano
   GET /api/planes/negocios/{id}/funciones                  → plan actual + features (MembershipContext)
```

**Observaciones (backend `docs/PAGOS.md`, `docs/SUSCRIPCIONES.md`):**
- La **activación real** ocurre por webhook (`status approved`); los `back_urls` solo redirigen.
- El webhook **valida la firma** de MercadoPago (`X-Signature` v2, HMAC-SHA256 con el access
  token, `ts` con anti-replay de 5 min) e incluye **idempotencia** por `mp_payment_id` + guard
  anti-replay de suscripciones activas.
- No hay suscripciones recurrentes reales de MP: la "renovación automática" es un booleano
  conceptual (fecha_fin + duración del plan).
- Feature gating en el frontend: `MembershipContext.tieneFuncion()` + `FeatureGuard` (mapa,
  imágenes) y límites en backend (`turnos_ilimitados`, `empleados_ilimitados`).

---

## 7. Flujo 7 — Marketplace y perfil público de negocio

```
Frontend (Negocios.tsx / NegocioPerfil.tsx)                 Backend
   GET /api/negocios/                                       → listar_negocios (solo activos)
   GET /api/categorias/                                     → categorías
   GET /api/georef/provincias | /georef/localidades         → georef
   GET /api/negocios/{id} | /slug/{slug}                    → perfil público (horarios, imágenes,
                                                              tiene_mapa)
   GET /api/negocios/mapa                                   → negocios con feature mapa_ubicacion
   Mapbox GL (frontend, Map.tsx) renderiza marcador con lat/long del negocio
   → CTA "Reservar" → /reservar/{slug}
```

---

## 8. Flujo 8 — Administración (panel admin)

```
Frontend (AdminPanel: AdminBusinessesSection /             Backend
          AdminUsersSection)
   GET  /api/negocios/admin                                 → listar_negocios_admin (con dueño)
   PUT  /api/negocios/{id}                                  → actualizar_negocio (dueño o admin)
   DELETE /api/negocios/{id}                                → eliminar_negocio (solo role admin; soft)
   GET  /api/usuarios/  | /api/usuarios/admin               → listados de usuarios
   PUT  /api/usuarios/{id}                                  → actualizar usuario
   PATCH /api/usuarios/{id}/estado                          → activar/desactivar usuario
   DELETE /api/usuarios/{id}                                → borrar usuario (físico)
```

> ⚠️ **CONTRADICCIÓN DOCUMENTADA (backend interno):** `docs/ENDPOINTS.md` y `docs/USUARIOS.md`
> documentan los endpoints `/api/usuarios/*` **sin autenticación**; `docs/AUTORIZACION.md` §4.1
> y `docs/CHANGELOG.md` (Fase 6, 12/08/2026) documentan que **ya exigen `get_current_user`**.
> Además, `docs/SEGURIDAD.md`/`docs/AUTORIZACION.md` señalan que el listado `/admin` y las
> mutaciones no se restringen por `role="admin"`. Ver
> [INTEGRACION-FRONTEND-BACKEND.md](./INTEGRACION-FRONTEND-BACKEND.md) §4.

---

## 9. Flujo 9 — Recuperación de contraseña

```
Frontend (Login → "olvidé contraseña")                      Backend
   POST /api/auth/forgot-password {email_us}                → auth_service.forgot_password
                                                             · respuesta idéntica exista o no el email
                                                             · token secrets.token_urlsafe(32) + 24 h
                                                             · email (errores de envío se silencian)
   POST /api/auth/reset-password/{token} {new_password,     → auth_service.reset_password
                                          confirm_password}  · 400 token inválido/expirado
                                                              · valida regex, rechaza igual a anterior
                                                              · limpia token
   → /login
```

---

## 10. Flujo 10 — Login con Google

```
Frontend (SocialAuthButtons.tsx → google.accounts.id)        Backend
   obtiene credential (id_token JWT de Google)
   POST /api/auth/google {id_token}                          → auth_service.login_with_google
                                                              · verifica id_token (aud, exp, issuer)
                                                              · 409 si el email existe con otro provider
                                                              · si existe local → emite token
                                                              · si no → crea usuario (auth_provider=
                                                                "google", contrasena_us=None,
                                                                email_verified=False) y envía
                                                                email de verificación → "revisá tu email"
```

> ⚠️ **Observaciones documentadas (backend `docs/AUTENTICACION.md`):** el backend imprime en
> consola `GOOGLE_CLIENT_ID`, prefijo del token y el **payload completo del id_token**
> (fuga de datos en logs). Además, en el frontend `docs/CONFIGURACION.md` se documenta que
> `VITE_GOOGLE_CLIENT_ID` **no está presente** en `.env.local` y que el SDK de Google no se
> carga en el HTML (`docs/COMPONENTES.md` §3.4) → el botón de Google **no funciona** en el
> entorno analizado. Ver [SEGURIDAD-SISTEMA.md](./SEGURIDAD-SISTEMA.md) y
> [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md).

---

## 11. Resumen de actores y sus capacidades

| Actor | Capacidades (frontend) | Respaldado por (backend) |
|---|---|---|
| **Cliente final** | Explorar, ver perfil, reservar, recibir email+QR | endpoints públicos de negocios/servicios/empleados/horarios/turnos (`disponibilidad` + POST) |
| **Dueño** | Onboarding, dashboard, agenda, estados, servicios, empleados, horarios, estadísticas, suscripción | endpoints con `get_current_user`/`get_current_negocio` |
| **Admin** | Panel de negocios y usuarios | `/negocios/admin`, `/usuarios/*`, PUT/DELETE negocios con `role="admin"` |
| **MercadoPago** | — (integración) | `/api/pagos/webhook` |