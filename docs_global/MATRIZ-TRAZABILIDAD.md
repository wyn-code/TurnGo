# MATRIZ DE TRAZABILIDAD — TurnoGo

Mapa que vincula **requisitos → documentación → código → componentes**, y consolida las
**contradicciones documentadas** y los **vacíos de información** relevantes para la tesis.

---

## 1. Leyenda de trazabilidad

| Sigla | Significado |
|---|---|
| FE | Frontend (`Turnexo_front`) |
| BE | Backend (`Turnexo`) |
| G | Documento global (esta carpeta `docs_global/`) |
| ✔ | Requisito cubierto / verificado en documentación |
| ⚠️ | Cubierto con contradicción o de forma parcial |
| ✘ | No implementado / ausente |
| ? | No determinable con la documentación actual |

---

## 2. Trazabilidad funcional: requisito → documentación → código

### 2.1 Catálogo y marketplace

| Requisito | Doc fuente | Código | Estado |
|---|---|---|---|
| Listar negocios activos | BE `NEGOCIOS.md`; FE `ESTADO_Y_DATOS.md` | `negocio_service.listar_negocios`; `useBusinesses` | ✔ |
| Ver perfil público con horarios/imágenes/mapa | BE `NEGOCIOS.md`; FE `COMPONENTES.md` | `obtener_negocio_publico_por_id`; `NegocioPerfil.tsx` | ✔ |
| Buscar por slug | BE `NEGOCIOS.md`; FE `ESTADO_Y_DATOS.md` | `obtener_negocio_por_slug`; `useBusinessBySlug` | ✔ |
| Mapa con negocios con feature `mapa_ubicacion` | BE `NEGOCIOS.md`; FE `COMPONENTES.md` | `obtener_negocios_mapa`; `Map.tsx` | ✔ |
| Categorías y georef (provincias/localidades) | BE `ENDPOINTS.md` §10-11 | `categoria_service`; `georef_service` | ✔ |

### 2.2 Reserva de turnos

| Requisito | Doc fuente | Código | Estado |
|---|---|---|---|
| Crear reserva con validaciones | BE `RESERVAS.md` §3 | `turno_service.crear_turno`; `appointment.service.createAppointment` | ✔ |
| Turnos ocupados por rango (disponibilidad) | BE `RESERVAS.md` §5; FE `ESTADO_Y_DATOS.md` | `listar_turnos_por_negocio_y_rango`; `useAppointments` | ✔ |
| Cliente get-or-create por teléfono | BE `RESERVAS.md` §6; FE `ESTADO_Y_DATOS.md` | `cliente_service.obtener_o_crear_cliente` | ✔ |
| Horarios de atención (máx 2 franjas/día) | BE `HORARIOS.md` | `horarios_negocio_service._validar_horarios` | ✔ |
| Anti-solapamiento (Python + GiST) | BE `RESERVAS.md` §5.3 | `hay_superposicion` + índice de exclusión | ✔ |
| Edición/borrado de turno | BE `RESERVAS.md` §8 | `actualizar_turno`/`borrar_turno` | ⚠️ auth contradictoria; frontend no lo invoca |

### 2.3 Gestión del dueño

| Requisito | Doc fuente | Código | Estado |
|---|---|---|---|
| Onboarding atómico del negocio (7 pasos) | BE `NEGOCIOS.md` §4; FE `COMPONENTES.md` | `crear_negocio_completo`; `RegistrarNegocio.tsx` | ✔ |
| CRUD de servicios (soft delete/toggle) | BE `SERVICIOS.md` | `servicio_service`; `useCreate/Update/ToggleService` | ✔ |
| CRUD de empleados | BE `ENDPOINTS.md` §6; FE `ESTADO_Y_DATOS.md` | `empleado_service` (GET/POST) vs `useUpdate/ToggleEmployee` | ⚠️ **mutaciones sin endpoint** |
| Agenda + estados de turno | BE `ESTADOS_TURNO.md` | `cambiar_estado_turno`; `statusMutation` | ✔ |
| Estadísticas del dashboard | BE `ENDPOINTS.md` §14 | `StatisticsService.get_dashboard_statistics`; `useEstadistica` | ✔ |
| Cancelación con motivo + email | BE `ESTADOS_TURNO.md` §5; `EMAILS.md` | `CambiarEstadoTurno` validador; `send_cancellation_email` | ✔ |

### 2.4 Membresía y pagos

| Requisito | Doc fuente | Código | Estado |
|---|---|---|---|
| Planes Free/Básico/VIP con features | BE `SUSCRIPCIONES.md` §2 | `seed_planes`; `plan_router` | ✔ |
| Límite 10 turnos/día y 3 empleados (Free) | BE `SUSCRIPCIONES.md` §5 | `turno_service`/`empleado_service` | ✔ |
| Preferencia de pago + webhook + única activa | BE `PAGOS.md` | `crear_preferencia_mp`; `procesar_pago_exitoso` | ✔ firma `X-Signature` v2 + idempotencia (`mp_payment_id`) + anti-replay |
| Suscripción actual/cancelar/renovación | BE `PAGOS.md` §6; FE `ESTADO_Y_DATOS.md` | `pago_router`; `useMembershipMutations` | ✔ |
| Gating por feature en UI | FE `COMPONENTES.md` §6.2 | `FeatureGuard`/`MembershipContext.tieneFuncion` | ✔ |

### 2.5 Autenticación y cuentas

| Requisito | Doc fuente | Código | Estado |
|---|---|---|---|
| Registro + verificación de email | BE `AUTENTICACION.md` §2 | `register_user`/`verify_email`; `Registro.tsx` | ✔ |
| Login email/contraseña | BE `AUTENTICACION.md` §3 | `login_user`; `Login.tsx` | ⚠️ 2FA no obligatoria |
| 2FA por OTP | BE `AUTENTICACION.md` §4 | `verify_credentials`/`verify_2fa`; `VerificarCodigo.tsx` | ✔ OTP `secrets` + hash HMAC + lockout 5 intentos |
| Login con Google | BE `AUTENTICACION.md` §5 | `login_with_google`; `SocialAuthButtons.tsx` | ✘ botón roto (falta config); backend valida `estado` ✔ |
| Reset de contraseña | BE `AUTENTICACION.md` §7 | `forgot_password`/`reset_password` | ✔ |
| Sesión persistente + `/auth/me` | FE `ESTADO_Y_DATOS.md` §4.1 | `AuthContext`/`ApiClient` | ✔ |

### 2.6 Administración

| Requisito | Doc fuente | Código | Estado |
|---|---|---|---|
| Panel admin de negocios/usuarios | FE `COMPONENTES.md` §7 | `AdminBusinessesSection`/`AdminUsersSection` | ✔ (UI) |
| Respaldo por rol del backend | BE `AUTORIZACION.md` | `require_role("admin")` en mutaciones de catálogo; `/usuarios/admin` sin restricción | ⚠️ parcial |

---

## 3. Trazabilidad documentación → repositorio

| Documento global | Doc. fuente principal (backend) | Doc. fuente principal (frontend) |
|---|---|---|
| ARQUITECTURA-SISTEMA | ARQUITECTURA, ESTRUCTURA, TECNOLOGIAS, BASE_DE_DATOS | ARQUITECTURA, ESTADO_Y_DATOS, ROUTING |
| FLUJO-END-TO-END | AUTENTICACION, USUARIOS, NEGOCIOS, RESERVAS, ESTADOS_TURNO, PAGOS, EMAILS | ROUTING, FLUJO_DATOS, ESTADO_Y_DATOS, PAGOS, AUTENTICACION |
| MODELO-DOMINIO | MODELOS, BASE_DE_DATOS | types/api.ts (vía COMPONENTES/ESTADO_Y_DATOS) |
| INTEGRACION-FRONTEND-BACKEND | API, ENDPOINTS, RESERVAS | API_CLIENT, ESTADO_Y_DATOS, CONFIGURACION |
| REGLAS-NEGOCIO | RESERVAS, ESTADOS_TURNO, HORARIOS, SUSCRIPCIONES, NEGOCIOS, SERVICIOS, PAGOS, EMAILS, QR | COMPONENTES, ESTADO_Y_DATOS, FLUJO_DATOS |
| SEGURIDAD-SISTEMA | AUTENTICACION, AUTORIZACION, SEGURIDAD, CONFIGURACION | AUTENTICACION, SEGURIDAD, CONFIGURACION |
| INFRAESTRUCTURA | CONFIGURACION, DESPLIEGUE, TECNOLOGIAS, ESTRUCTURA | CONFIGURACION, DESPLIEGUE, TECNOLOGIAS |
| MATRIZ-TRAZABILIDAD | todos los anteriores | todos los anteriores |

---

## 4. Trazabilidad requisito-tesis → componente (concentrada)

| Requisito de tesis (hipótesis) | Componentes que lo sostienen | Dónde se documenta |
|---|---|---|
| Sistema de reservas con anti-solapamiento | índice GiST + `hay_superposicion` + wizard `Reservar` | `MODELO-DOMINIO` §5; `REGLAS-NEGOCIO` §1 |
| Negocio como unidad de configuración (1 usuario ↔ 1 negocio) | `Negocio.usuario_id` UNIQUE + onboarding atómico | `MODELO-DOMINIO` §2.2; `FLUJO-END-TO-END` §3 |
| Monetización por planes/features | `Plan`/`PlanFeature`/`Suscripcion` + gating backend/UI | `REGLAS-NEGOCIO` §4; `SEGURIDAD-SISTEMA` §3 |
| Autenticación propia (email + 2FA) | JWT HS256 + OTP + verificación de email | `SEGURIDAD-SISTEMA` §2 |
| Notificación multicanal | Resend (email+QR) + mapa de estados | `REGLAS-NEGOCIO` §8-9 |

---

## 5. Contradicciones documentadas (consolidadas)

| # | Contradicción | Documentos enfrentados | Dónde se analiza |
|---|---|---|---|
| C-1 | **`/usuarios/*` sin auth vs. con auth** | BE `ENDPOINTS.md` §3 + `USUARIOS.md` §3 ("no exigen token") vs. BE `AUTORIZACION.md` §4.1 + `CHANGELOG.md` Fase 6 ("CORREGIDO 12/08/2026: exigen `get_current_user`") | [INTEGRACION](./INTEGRACION-FRONTEND-BACKEND.md) §4.2; [SEGURIDAD](./SEGURIDAD-SISTEMA.md) §3 |
| C-2 | **CRUD `/turnos` público vs. protegido** | BE `ENDPOINTS.md` §9 + `RESERVAS.md` §2 ("sin autenticación") vs. BE `AUTORIZACION.md` §4.2 + `CHANGELOG.md` Fase 6 ("CORREGIDO: `get_current_negocio` + propiedad") | [INTEGRACION](./INTEGRACION-FRONTEND-BACKEND.md) §4.3; [FLUJO](./FLUJO-END-TO-END.md) §5 — **resuelto**: CRUD y `por-rango` protegidos; `disponibilidad` público |
| C-3 | **`SECRET_KEY` obligatoria vs. con default** | BE `AUTENTICACION.md`/`SEGURIDAD.md`/`CONFIGURACION.md` (obligatoria) vs. BE `USUARIOS.md` §5 (`"change-this-secret-in-production"`) | [SEGURIDAD](./SEGURIDAD-SISTEMA.md) §2.3 |
| C-4 | **2FA en login** | BE `AUTENTICACION.md` §3 (login sin 2FA) vs. FE `ESTADO_Y_DATOS.md` §4.1 (frontend espera `requires_2fa`) | [INTEGRACION](./INTEGRACION-FRONTEND-BACKEND.md) §6; [FLUJO](./FLUJO-END-TO-END.md) §2 |
| C-5 | **Empleados PUT/PATCH/DELETE** | FE `ESTADO_Y_DATOS.md` §5.2 (usa PUT/PATCH/DELETE) vs. BE `API.md`/`ENDPOINTS.md` §6 (solo GET/GET/POST) | [INTEGRACION](./INTEGRACION-FRONTEND-BACKEND.md) §4.1 |
| C-6 | **Endpoints en inglés (legado)** | FE `api-config.ts` (objeto `endpoints` en inglés) vs. services del frontend (español) y routers backend | [INTEGRACION](./INTEGRACION-FRONTEND-BACKEND.md) §8 |
| C-7 | **QR: verificación** | BE `QR.md` (sin endpoint de validación; payload solo id) vs. UX que presenta el QR como comprobante | [REGLAS-NEGOCIO](./REGLAS-NEGOCIO.md) §9 |
| C-8 | **Alembic / esquema real** | BE `BASE_DE_DATOS.md` (ORM vs SQL divergen; alembic sin setup) | [MODELO-DOMINIO](./MODELO-DOMINIO.md) §1 |

---

## 6. Vacíos de información para la tesis (requieren verificación de código)

| # | Pregunta abierta | Sugerencia de verificación |
|---|---|---|
| V-1 | ~~¿`auth_service.login_user` devuelve `requires_2fa`?~~ | **Resuelto** — leído `app/services/auth_service.py`: devuelve token si 2FA reciente, si no `None` → `/auth/login` responde `requires_2fa` |
| V-2 | ¿`PUT/DELETE /negocios/{id}` validan que el negocio pertenezca al token? (IDOR) | Leer `negocio_service.actualizar_negocio`/`eliminar_negocio` |
| V-3 | ¿Los routers `/usuarios` y `/turnos` (CRUD) exigen token hoy? | Leer `usuario_router.py` y `turno_router.py` (estado real 2026) |
| V-4 | ~~¿`get_current_user` valida `estado` del usuario?~~ | **Resuelto** — leído `app/core/dependencies.py`: valida `estado` (401 "Tu cuenta está desactivada") |
| V-5 | ¿Dónde se inyecta `require_feature(...)`? (docs dicen que no está montado) | `grep Depends(require_feature` en routers |
| V-6 | ¿Qué endpoints de `/empleados` existen realmente? (edición/borrado ausentes) | **Verificado** — `empleado_router.py`: GET / (público), GET /{id} y POST 🔒 + propiedad; PUT/PATCH/DELETE siguen ausentes |
| V-7 | ¿Se validan límites/longitudes del OTP en el schema? (SEGURIDAD.md: NO DETERMINADO) | Leer `auth_schema.py` |
| V-8 | ¿`estadistica._total_available_slots` maneja mal el cruce de medianoche? | Leer `estadistica_service.py` (HORARIOS.md §7) |
| V-9 | ¿`negocio.usuario_id` real 1:1 y cascade confirmados en SQL? | Revisar migraciones `supabase/migrations/*.sql` |

---

## 7. Cobertura de documentos globales

| Documento | Entregado | Contenido principal |
|---|---|---|
| README.md | ✔ | Índice, propósito, datos rápidos, advertencias |
| ARQUITECTURA-SISTEMA.md | ✔ | Capas, componentes, routers, flujo de petición, diagramas |
| FLUJO-END-TO-END.md | ✔ | 10 flujos completos (registro, login, onboarding, reserva, agenda, pagos, admin, reset, Google) |
| MODELO-DOMINIO.md | ✔ | 16 entidades, ER, mapa entidad→API→frontend, integridad |
| INTEGRACION-FRONTEND-BACKEND.md | ✔ | Contrato API, mapa services→endpoints, 5 brechas |
| REGLAS-NEGOCIO.md | ✔ | 12 secciones de reglas verificadas (backend vs. interfaz) |
| SEGURIDAD-SISTEMA.md | ✔ | Auth, autorización, RLS, terceros, 12 riesgos, recomendaciones |
| INFRAESTRUCTURA.md | ✔ | Entornos, variables, despliegue, dependencias, checklist, brechas |
| MATRIZ-TRAZABILIDAD.md | ✔ | Trazabilidad requisito→doc→código, 8 contradicciones, 9 vacíos |

**Total: 9 documentos en `docs_global/`.**