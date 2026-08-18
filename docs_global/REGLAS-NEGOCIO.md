# REGLAS DE NEGOCIO — TurnoGo

Reglas funcionales verificadas en la documentación del sistema. Se distingue claramente qué
regla es del **backend** (fuente: `docs/RESERVAS.md`, `docs/ESTADOS_TURNO.md`,
`docs/HORARIOS.md`, `docs/SUSCRIPCIONES.md`, `docs/NEGOCIOS.md`, `docs/SERVICIOS.md`,
`docs/RESERVAS.md` — clientes incluidos en `RESERVAS.md` §6) y qué regla es de
**interfaz/frontend** (fuente:
`docs/COMPONENTES.md`, `docs/ESTADO_Y_DATOS.md`, `docs/FLUJO_DATOS.md`).

> **Principio de los docs originales:** "no atribuir al backend reglas que solo existen en la
> interfaz" y viceversa. Esta página conserva esa separación.

---

## 1. Turnos: creación de reserva

### 1.1 Reglas del backend (`turno_service.crear_turno`)

Validadas en este orden al hacer `POST /api/turnos/`:

| # | Regla | Falla → |
|---|---|---|
| 1 | El servicio debe existir, pertenecer al negocio, estar **activo** y el **negocio activo** | 404 |
| 2 | Límite del plan Free: máximo **10 turnos del día** por negocio (en la fecha de inicio, estado ≠ CANCELADO); solo se saltea con la feature `turnos_ilimitados` | 403 |
| 3 | `fecha_hora_fin` = `fecha_hora_inicio + servicio.duracion_min` (si no se envía) | — |
| 4 | Rango válido (`fin > inicio`) | 400 |
| 5 | Empleado (si se envía) debe pertenecer al negocio y estar activo | 400 |
| 6 | El turno debe caer dentro de una franja de atención del negocio | 400 |
| 7 | No debe solaparse con otro turno | 409 |
| 8 | El cliente debe existir (aquí **no** se crea) | 404 |
| 9 | Estado inicial = **CONFIRMADO** (fijo) | — |
| 10 | Email de confirmación con QR en background (solo si cliente tiene email) | best-effort |

**Sobre el estado `PENDIENTE`:** definido en el catálogo y en la máquina, pero **ningún flujo
lo asigna**. El campo `servicio.requiere_aprobacion` existe pero **no condiciona** el estado
inicial. No inventar un flujo de "aprobación pendiente".

### 1.2 Reglas del frontend (interfaz, `Reservar.tsx`)

- La disponibilidad (slots libres) se calcula **client-side**: el frontend consulta turnos
  ocupados (`por-rango`) + franjas (`horarios`) y deshabilita horarios según su propia lógica.
- El backend **no** expone un endpoint de "slots disponibles" ni un estado "expirado".

### 1.3 Solapamiento (backend)

- **Sin empleado:** no debe solaparse con **ningún** turno del negocio (incluidos los que tienen
  empleado).
- **Con empleado:** no debe solaparse con turnos de *ese* empleado.
- **No filtra por estado:** los turnos `CANCELADO` cuentan como ocupación.
- **Doble defensa:** validación en Python + índice de exclusión **GiST**
  `(id_empleado, tstzrange(...))` que rechaza la condición de carrera. El caso sin empleado solo
  tiene validación en aplicación.

---

## 2. Horarios de atención (backend, `horarios_negocio_service`)

1. `hora_apertura != hora_cierre` en cada franja (400).
2. Máximo **2 franjas por día** (`MAX_FRANJAS_POR_DIA`) (400).
3. Las franjas del mismo día no pueden **superponerse** (400); se normaliza el cierre que cruza
   medianoche sumando 1440 min.
4. Un negocio **sin horarios** es válido: la validación de horario se **omite** al crear turnos.
5. `PUT /horarios/{id_negocio}` **reemplaza** todas las franjas (delete + insert).
6. Franja con `cierre <= apertura` = **cruza la medianoche** (caso de primer nivel, soportado en
   validación, en turnos y en métrica de ocupación).
7. `GET /horarios/{id_negocio}` devuelve **404 si no hay horarios** (no existe horario por defecto).

**Validación de turno dentro del horario** (`validar_turno_dentro_del_horario`):
- Franja normal: `apertura <= inicio AND fin <= cierre`.
- Franja que cruza medianoche: `(inicio >= apertura OR inicio <= cierre)` y
  `(fin >= apertura OR fin <= cierre)`.
- El día se compara con `{inicio.weekday(), inicio.isoweekday()}`.

---

## 3. Máquina de estados del turno (backend)

Catálogo: `PENDIENTE=1`, `CONFIRMADO=2`, `COMPLETADO=3`, `CANCELADO=4`, `NO_ASISTIO=5`.

`TRANSICIONES_PERMITIDAS`:

```python
{
    PENDIENTE:  [CONFIRMADO, CANCELADO],
    CONFIRMADO: [COMPLETADO, CANCELADO, NO_ASISTIO],
}
```

| Regla | Detalle |
|---|---|
| Estados terminales | `COMPLETADO`, `CANCELADO`, `NO_ASISTIO` — irreversibles (no figuran como claves del dict) |
| Estado inicial | Siempre `CONFIRMADO` (la transición `PENDIENTE→CONFIRMADO` está declarada pero es inalcanzable hoy) |
| `PUT /turnos/{id}/estado` | Solo dueño (`get_current_negocio`); 403 si el turno no es del negocio; 400 si la transición es inválida |
| `PUT /turnos/{id}` | Si envía `id_estado`, aplica la misma máquina |
| Cancelar | `id_estado == CANCELADO` ⇒ `rechazado_motivo` **obligatorio** (≥5, ≤500, no solo espacios) |
| Cambios automáticos | **Ninguno** (un turno pasado conserva su estado hasta que el dueño lo cambie) |

**Interpretación en estadísticas** (`estadistica_service`):
- `ACTIVE_STATES = [PENDIENTE, CONFIRMADO, COMPLETADO]` → agenda, clientes recurrentes, ocupación.
- `CANCELADO`/`NO_ASISTIO` → cancelaciones/no-shows.
- `tasaAsistencia = completados / total`; facturación solo con turnos **COMPLETADO**.
- `"reprogramados": 0` fijo: "reprogramar" = **editar fecha** con `PUT /turnos/{id}` (no es un estado).

---

## 4. Planes y límites por suscripción (backend)

| feature_key | Se fuerza en | Efecto si NO está activa |
|---|---|---|
| `turnos_ilimitados` | `crear_turno` | límite **10 turnos/día** (403) |
| `empleados_ilimitados` | `crear_empleado` | límite **3 empleados** (403) |
| `imagenes_personalizadas` | `actualizar_negocio` | 403 si envía `imagenes` |
| `mapa_ubicacion` | `obtener_negocios_mapa` / `tiene_mapa` | el negocio no sale en el mapa |
| `recordatorio_email`/`recordatorio_whatsapp` | `scheduler_wsp` (módulo no activo) | sin recordatorios |
| `soporte_prioritario` | — | solo label del plan VIP |

**Reglas de suscripción (backend, `payment_service`):**
- Estados de `Suscripcion.estado`: `activa`, `pendiente`, `cancelada`.
- **Una sola activa** por negocio, garantizada por lógica de servicio:
  1. al crear preferencia → las `pendiente` previas pasan a `cancelada`;
  2. al confirmar pago (`procesar_pago_exitoso`) → se cancelan otras `pendiente` y otras `activa`.
- Las restricciones se firman por `feature_key`, no por nombre de plan.
- `obtener_funciones_negocio` devuelve features de la **suscripción activa vigente**
  (`estado=activa` y `fecha_fin >= now`).

---

## 5. Negocio (backend, `negocio_service`)

| Operación | Requisito |
|---|---|
| Listar/mapa/público/slug | público; solo `activo == True` |
| `GET /negocios/me` | usuario autenticado |
| Crear | usuario autenticado; `usuario_id = current_user.id_us`; categoría obligatoria; localidad/provincia si se envían deben existir |
| Actualizar | **dueño** (`usuario_id == current_user.id_us`) **o** `role == "admin"`; `imagenes` exige feature `imagenes_personalizadas` |
| Eliminar | **solo `role == "admin"`**; soft delete (`activo=False`) |
| Slug | `nombre.lower()` → espacios a `-` → solo `[a-z0-9-]`; sufijos `-1`, `-2`… si está tomado |

**Onboarding atómico:** `crear_negocio_completo` inserta Negocio + imágenes (portada = índice
0) + servicios + empleados + horarios en **una transacción**; falla → 500 "Error al crear el negocio".

---

## 6. Servicios y empleados (backend)

| Entidad | Reglas |
|---|---|
| **Servicio** | Titularidad: crear/editar/toggle/eliminar exige `negocio.usuario_id == current_user.id_us` (403 si no). Soft delete (`activo=False`); `PATCH` hace toggle. `duracion_min` define el bloqueo de agenda. `role admin` no se consulta aquí. |
| **Empleado** | `POST /empleados/` valida negocio y límite Free (3). Sin endpoints de edición/borrado en el backend (ver [INTEGRACION-FRONTEND-BACKEND.md](./INTEGRACION-FRONTEND-BACKEND.md) §4.1). |
| **Cliente** | Identidad por teléfono **UNIQUE**; `get-or-create` normaliza (quita espacios/no-dígitos salvo `+`, mínimo 8 dígitos), completa email si el cliente existente no lo tiene; nombre y apellido obligatorios. |
| **Categoría** | `nombre` único; `icono` debe ser URL http(s) de imagen; `DELETE` físico (puede fallar por FK). |

---

## 7. Pagos (backend, MercadoPago)

| Regla | Detalle |
|---|---|
| Modo de pago | Checkout Pro vía **preferencias** (`init_point`); sin tarjeta procesada localmente |
| `external_reference` | `"{id_negocio}:{id_plan}"` (llave del webhook) |
| Activación | **Solo por webhook** (`topic=payment`, `status=approved`); los `back_urls` solo redirigen |
| Vencimiento de preferencia | `date_of_expiration` = +24 h |
| Modo test | token `TEST-*` ⇒ se usa `sandbox_init_point` si MP lo devuelve |
| Cancelar suscripción | solo `activa`/`pendiente`; 400 en otro estado |
| Webhook | **no valida firma**; siempre responde 200 `{"status":"ok"}` (errores logueados) |

---

## 8. Emails (backend, Resend)

| Email | Cuándo | Condición |
|---|---|---|
| Verificación de cuenta | registro / Google / `POST /usuarios/` | siempre (token 24 h) |
| Reset de contraseña | forgot-password | solo si el email existe; errores de envío silenciados |
| OTP 2FA | verify-credentials / resend-code | cuando la 2FA no está reciente |
| Confirmación de turno (+QR) | creación de turno | **solo si el cliente tiene email**; background |
| Cancelación de turno | cambio de estado → CANCELADO | solo si: era distinto de CANCELADO **y** hay email **y** hay motivo |
| `send_two_factor_email` | — | definida pero **sin llamadores** (huérfana) |

- Sin reintentos ni cola: los emails son best-effort (`BackgroundTasks`).
- Copy vs. código: el email dice "OTP vence en 10 minutos", pero la expiración efectiva es
  `TWO_FACTOR_TOKEN_EXPIRE_HOURS` (default 9 h) — divergencia real documentada.

---

## 9. QR (backend)

- Payload: URL `{FRONTEND_URL}/dashboard/turnos?turno={id_turno}` (solo el id del turno).
- Formato: PNG en memoria (`qrcode.make`, box_size 8, border 2), adjunto al email de confirmación.
- No hay almacenamiento, endpoint de escaneo ni validación de vigencia en el backend; la
  presentación/verificación queda del lado del frontend (la página `/dashboard/turnos?turno=…`).
- El QR **no cambia** si se edita el turno (el payload solo depende del id).

---

## 10. Estadísticas (backend)

- Ruta única: `GET /api/statistics/business/{business_id}` con `get_current_negocio` + 403 si no
  es el negocio del token.
- Rango por `date_start`/`date_end` (default: mes actual).
- Métricas: `kpis`, `resumen` (hoy/semana/mes, turnosPorDia), `clientes` (nuevos/recurrentes/
  inactivos/top), `servicios`, `ingresos` (diario/semanal/mensual, ticket promedio, evolución 6
  meses), `agenda` (horario pico, ocupación), `asistencia` (completados/cancelados/noShow/tasa),
  `empleados` (turnos/ingresos/ocupación).

---

## 11. Reglas de interfaz / UX (frontend)

| Regla | Dónde |
|---|---|
| Wizard de reserva en 4 pasos (servicio → profesional+fecha → datos → confirmación) | `Reservar.tsx` |
| Disponibilidad (slots) calculada en cliente con `por-rango` + `horarios` | `Reservar.tsx` |
| QR mostrado al confirmar reserva (`QRCodeSVG`, deep-link `/dashboard/turnos?turno={id}`) | `BookingSummary.tsx` |
| Gating de features con `FeatureGuard` (mapa, imágenes personalizadas) | `DashboardPersonalizacion` |
| Onboarding en 7 pasos con validación por paso (`trigger`) | `RegistrarNegocio.tsx` |
| Dashboard con vista Hoy/Semana y diálogo de cancelación con motivo | `DashboardTurnos.tsx` |
| Exportar estadísticas (Excel/CSV) | `StatsExportButton` → `exportStatisticsFile` |
| Botón "Añadir a Google Calendar" | `BookingSummary.tsx` (genera URL) |

---

## 12. Reglas de autenticación (transversales)

| Regla | Estado documentado |
|---|---|
| Contraseña: 12–16 caracteres, mayúscula, minúscula, dígito y especial (`@$!%*?&.#_-`) | backend |
| `email_verified` gatea el login (403 si no está verificado) | backend |
| Token JWT: HS256, claims `exp`/`sub`, 60 min (`/auth/login`, `verify-email`) | backend |
| 2FA "recordada" 9 h (`last_2fa_verified_at`) | backend |
| Login con Google: `id_token` verificado (aud, exp, issuer); 409 si el email existe con otro provider | backend |
| `estado` del usuario **no** se valida al loguear | backend (debilidad) |
| Sesión persistida en `localStorage` (`turnexo_token`, `turnexo_user`, `turnexo_pending_2fa_email`); token en memoria de `ApiClient` | frontend |

> Todas las reglas de seguridad y sus riesgos se amplían en
> [SEGURIDAD-SISTEMA.md](./SEGURIDAD-SISTEMA.md).