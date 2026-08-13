# Rutas del frontend — TurnoGo

Catálogo exhaustivo de **todas las rutas declaradas** en `src/App.tsx` y sus
sub-rutas anidadas (`/dashboard/*`, `/admin/*`). Para cada ruta se indica:
path, componente/página, parámetros, protección y propósito.

> **Fuente única**: `src/App.tsx:43-70` (definición del `<Routes>`) +
> `src/features/dashboard/pages/Dashboard.tsx:40-48` (rutas hijas) +
> `src/features/admin/pages/AdminPanel.tsx:51-54` (rutas hijas).

---

## 1. Mapa global (resumen)

| Área | Prefijo | Protección |
|------|---------|------------|
| Landing / pública | `/`, `/negocios`, `/negocio/:slug` | — |
| Reserva pública | `/reservar/:slug` | — |
| Autenticación | `/login`, `/registro`, `/verificar-codigo`, `/olvide-contrasena`, `/restablecer-contrasena`, `/verify-email/:token`, `/restablecer-contrasena/:token`, `/auth-success` | — (páginas de login) |
| Onboarding dueño | `/registrar-negocio` | `ProtectedRoute` → dueño sin negocio |
| Dashboard dueño | `/dashboard/*` | `ProtectedRoute` → dueño con negocio |
| Membresía | `/planes`, `/mi-suscripcion` | `ProtectedRoute` → dueño con negocio |
| Pagos | `/pagos/resultado` | — (callback de MP) |
| Admin | `/admin/*` | `AdminRoute` → solo `role === "admin"` |
| 404 | `*` | — |

---

## 2. Rutas públicas

| Path | Componente | Parámetros | Propósito |
|------|------------|------------|-----------|
| `/` | `src/features/landing/pages/Index.tsx` | — | Home: hero, beneficios, categorías, cómo funciona, negocios recomendados, planes VIP, CTA. |
| `/negocios` | `src/features/business/pages/Negocios.tsx` | `searchParams`: `categoria?`, `ciudad?` (filtros client-side) | Marketplace: listado con búsqueda, filtro por categoría (sidebar) y ciudad (select). |
| `/negocio/:slug` | `src/features/business/pages/NegocioPerfil.tsx` | `:slug` (string) | Perfil público del negocio: portada, datos, mapa, servicios, profesionales, horarios, botón "Reservar". |
| `/reservar/:slug` | `src/features/booking/pages/reserva/Reservar.tsx` | `:slug` (string), `searchParams.servicio?` (pre-selección) | Flujo de reserva multi-paso (servicio → profesional → fecha/hora → datos → confirmación + QR). |

---

## 3. Rutas de autenticación (públicas, sin sesión)

| Path | Componente | Parámetros | Propósito |
|------|------------|------------|-----------|
| `/login` | `src/features/auth/pages/Login.tsx` | `location.state.from?` (redirect post-login) | Login email/contraseña + botón Google + enlace a registro / olvide contraseña. |
| `/registro` | `src/features/auth/pages/Registro.tsx` | — | Registro de usuario (forzado `role=duenio` en backend) + botón Google. |
| `/verificar-codigo` | `src/features/auth/pages/VerificarCodigo.tsx` | — | Ingreso de código OTP (2FA) tras login que responde `requires_2fa`. |
| `/olvide-contrasena` | `src/features/auth/pages/OlvideContrasena.tsx` | — | Solicitud de reset: `POST /auth/forgot-password`. |
| `/restablecer-contrasena` | `src/features/auth/pages/RestablecerContrasena.tsx` | — | Formulario de nueva contraseña (sin token; usa `/restablecer-contrasena/:token` para el flujo real). |
| `/verify-email/:token` | `src/features/auth/pages/VerifyEmailPage.tsx` | `:token` (string) | Verificación de email tras registro: `GET /auth/verify-email/:token` → sesión + redirect a `/registrar-negocio`. |
| `/restablecer-contrasena/:token` | `src/features/auth/pages/RestablecerContrasena.tsx` | `:token` (string) | Reset real de contraseña: `POST /auth/reset-password/:token` con `new_password`, `confirm_password`. |
| `/auth-success` | `src/features/auth/pages/AuthSuccess.tsx` | — | Pantalla genérica de éxito post-login social (Google). |

---

## 4. Rutas protegidas — onboarding y dashboard (requieren sesión + rol `duenio`)

Todas envueltas por `<ProtectedRoute>` (`src/features/auth/components/ProtectedRoute.tsx`). Lógica de `ProtectedRoute`:

1. Si `isLoading` → spinner.
2. Si `pendingTwoFaEmail` sin autenticar → `/verificar-codigo`.
3. Si no autenticado → `/login` con `state.from`.
4. Si `role === "admin"` → permite `/admin/*`, `/planes`, `/mi-suscripcion`; otros → `/admin`.
5. Si `role === "duenio"` y `!hasBusiness` → fuerza `/registrar-negocio` (salvo que ya esté ahí).
6. Si `role === "duenio"` y `hasBusiness` en `/registrar-negocio` → `/dashboard`.

| Path | Componente | Parámetros | Propósito |
|------|------------|------------|-----------|
| `/registrar-negocio` | `src/features/register-business/pages/RegistrarNegocio.tsx` | — | Wizard 7 pasos (info, imagen, contacto, ubicación, servicios, empleados, horarios) → `POST /negocios/complete` + horarios. Solo accesible a dueño **sin** negocio. |
| `/dashboard` | `src/features/dashboard/pages/Dashboard.tsx` → `DashboardResumen` | — | Resumen diario: KPIs (turnos hoy, días con horario, empleados/servicios activos), lista de turnos de hoy. |
| `/dashboard/turnos` | `DashboardTurnos` | — | Gestión de turnos: vista Hoy/Semana, máquina de estados (Pendiente→Confirmado/Cancelado, Confirmado→Completado/Cancelado/No asistió), motivo obligatorio al cancelar, QR deep-link `?turno=`. |
| `/dashboard/servicios` | `DashboardServicios` | — | CRUD de servicios: lista (activos/inactivos), crear (`ServiceForm`), editar, toggle activo (soft-delete). |
| `/dashboard/empleados` | `DashboardEmpleados` | — | CRUD de empleados: lista, crear/editar (`EmployeeForm`), toggle activo. |
| `/dashboard/horarios` | `DashboardHorarios` | — | Editor semanal (`ScheduleEditor`) con hasta 2 franjas/día; `POST`/`PUT /horarios/:id`. |
| `/dashboard/estadisticas` | `DashboardEstadisticas` | — | Analítica: 7 tabs (Resumen, Clientes, Servicios, Ingresos, Agenda, Asistencia, Empleados), rangos (hoy/semana/mes/año) + comparativa, export Excel/CSV. Cálculo client-side + merge opcional con `/statistics/business/:id`. |
| `/dashboard/configuracion` | `DashboardConfiguracion` | — | Datos del negocio (nombre, teléfono, WhatsApp, IG, dirección, ciudad) → `useUpdateBusiness`. |
| `/dashboard/personalizacion` | `DashboardPersonalizacion` | — | Logo, portada, feature gating (`FeatureGuard` para `mapa_ubicacion`, `imagenes_personalizadas`, `soporte_prioritario`). |

> **Nota**: `/dashboard` usa rutas hijas definidas en `Dashboard.tsx:40-48`. El componente padre `Dashboard.tsx` carga el negocio (`useMyBusiness`) y provee `DashboardBusinessContext`.

---

## 5. Rutas de membresía (protegidas — dueño con negocio)

| Path | Componente | Carga | Propósito |
|------|------------|-------|-----------|
| `/planes` | `src/features/membership/pages/Planes.tsx` (lazy) | `usePlanes()`, `useMembership()` | Listado de planes (`GET /planes/`), tarjetas `PlanCard`, botón "Suscribirse" → `POST /pagos/crear-preferencia` → redirect a `init_point` de Mercado Pago. |
| `/mi-suscripcion` | `src/features/membership/pages/MiSuscripcion.tsx` (lazy) | `useSuscripcionActual()`, `useCancelarSuscripcion`, `useToggleRenovacion` | Detalle de suscripción actual (`GET /pagos/suscripcion/actual`), cancelar, toggle renovación automática. |
| `/pagos/resultado` | `src/features/membership/pages/ResultadoPago.tsx` (lazy) | `useSearchParams().status` (`approved`/`failure`/`pending`) | Página de retorno de Mercado Pago; si `approved` → `MembershipContext.refresh()`. |

> `/planes` y `/mi-suscripcion` están en `ProtectedRoute` (dueño con negocio). `/pagos/resultado` es **pública** (callback de MP).

---

## 6. Rutas de administración (protegidas — solo `role === "admin"`)

Protección doble: `AdminRoute` (`src/features/admin/components/AdminRoute.tsx`) + `AdminPanel` verifica rol inline.

| Path | Componente | Propósito |
|------|------------|-----------|
| `/admin/` (index) | `AdminPanel` → redirect a `/admin/negocios` | Punto de entrada. |
| `/admin/negocios` | `AdminBusinessesSection` | Tabla de **todos** los negocios (`GET /negocios/admin`), búsqueda, editar (`EditBusinessModal`), eliminar (`DeleteBusinessDialog`). |
| `/admin/usuarios` | `AdminUsersSection` | Tabla de **todos** los usuarios (`GET /usuarios/admin`), editar (`EditUserModal`), toggle estado, eliminar. |

> `AdminRoute` redirige: no autenticado → `/login`; autenticado no admin → `/dashboard`.

---

## 7. Rutas de error y catch-all

| Path | Componente | Propósito |
|------|------------|-----------|
| `*` (catch-all) | `src/features/landing/pages/NotFound.tsx` | Página 404 con enlace a home. |

---

## 8. Lazy loading y Suspense

En `src/App.tsx:19-21`:
- `Planes`, `MiSuscripcion`, `ResultadoPago` → `React.lazy(() => import(...))`.
- Envuelto en `<Suspense fallback={<PageLoader />}>`.

---

## 9. Parámetros y query params por ruta (resumen técnico)

| Ruta | Path params | Query params | Body / State |
|------|-------------|--------------|--------------|
| `/negocio/:slug` | `slug` | — | — |
| `/reservar/:slug` | `slug` | `servicio` (pre-selección) | — |
| `/login` | — | — | `location.state.from` |
| `/verify-email/:token` | `token` | — | — |
| `/restablecer-contrasena/:token` | `token` | — | — |
| `/pagos/resultado` | — | `status=approved\|failure\|pending` | — |
| `/negocios` | — | `categoria` (id), `ciudad` (slug) | — |
| `/dashboard/turnos` | — | `turno` (id para highlight) | — |

---

## 10. Redirecciones programáticas (resumen)

| Origen | Condición | Destino |
|--------|-----------|---------|
| `ProtectedRoute` | `!isAuthenticated` | `/login?from=...` |
| `ProtectedRoute` | `pendingTwoFaEmail` | `/verificar-codigo` |
| `ProtectedRoute` | `role=admin` fuera de `/admin` | `/admin` |
| `ProtectedRoute` | `duenio` sin negocio ≠ `/registrar-negocio` | `/registrar-negocio` |
| `ProtectedRoute` | `duenio` con negocio en `/registrar-negocio` | `/dashboard` |
| `AdminRoute` | no admin | `/dashboard` o `/login` |
| `VerifyEmailPage` | éxito | `/registrar-negocio` (tras 2s) |
| `Planes` (suscribirse) | `init_point` recibido | `window.location.href = init_point` |
| `ResultadoPago` | `status=approved` | `refresh()` + UI de éxito |
| `Login` / `Registro` / `2FA` | éxito | `redirectPath || "/dashboard"` |
| `Logout` | — | `/login` |

---

## 11. Archivos de definición de rutas

| Archivo | Qué define |
|---------|------------|
| `src/App.tsx:43-70` | Rutas raíz + providers + lazy + catch-all. |
| `src/features/dashboard/pages/Dashboard.tsx:40-48` | Sub-rutas `/dashboard/*` (8 páginas). |
| `src/features/admin/pages/AdminPanel.tsx:51-54` | Sub-rutas `/admin/*` (2 páginas). |
| `vercel.json` | Rewrite SPA: `/*` → `/index.html` (necesario en Vercel). |