# Documentación Global — Sistema TurnoGo

Documentación integral del sistema **TurnoGo**, un software web de gestión de turnos
para comercios (Pyme/emprendimientos). Esta carpeta consolida la documentación de los
dos repositorios que componen el sistema:

| Repositorio | Rol | Stack principal | Doc original |
|---|---|---|---|
| `Turnexo_front` | Aplicación web (SPA) del cliente, el dueño del negocio y el administrador | React 19, Vite, TypeScript, React Router 7, TanStack React Query 5, Tailwind CSS + shadcn/ui | `docs/` del frontend |
| `Turnexo` | API REST monolítica (backend) | FastAPI, SQLAlchemy 2.x, PostgreSQL 17 (Supabase), JWT HS256 | `docs/` del backend |

> **Fuente de verdad:** toda esta documentación se elaboró a partir de los documentos
> Markdown existentes en `docs/` de cada repositorio. Cuando dos documentos se
> contradicen (o un documento contradice el código), se indica explícitamente en cada
> sección afectada y se resume en [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md).

---

## 1. Qué es TurnoGo

TurnoGo permite a un **comercio** (el "negocio" o "dueño"):

- Crear y administrar su **perfil público** (datos, categoría, imágenes, ubicación en mapa).
- Definir **servicios** (con duración y precio), **empleados** y **horarios de atención**.
- Recibir **reservas de turnos** de clientes desde una página pública.
- Gestionar el **estado** de cada turno (confirmado, completado, cancelado, no asistió).
- Ver **estadísticas** de facturación, ocupación y asistencia.
- Suscribirse a **planes** (Free, Básico, VIP) con pago vía **Mercado Pago**.
- Enviar **emails** de verificación, 2FA, confirmación (con QR) y cancelación vía **Resend**.

El **cliente final** puede explorar negocios, ver el detalle de uno (servicios,
profesionales, horarios, mapa) y **reservar un turno** sin necesidad de cuenta.

Existe además un **panel administrativo** mínimo (listado/edición de negocios y usuarios)
que el frontend consume pero cuyo respaldo de autorización en el backend es limitado
(ver [SEGURIDAD-SISTEMA.md](./SEGURIDAD-SISTEMA.md)).

---

## 2. Índice de la documentación global

| Documento | Contenido |
|---|---|
| [README.md](./README.md) | Este índice. Panorama, propósito y guía de lectura. |
| [ARQUITECTURA-SISTEMA.md](./ARQUITECTURA-SISTEMA.md) | Arquitectura global: capas, componentes, repositorios, flujo de una petición, diagramas. |
| [FLUJO-END-TO-END.md](./FLUJO-END-TO-END.md) | Recorridos completos usuario-sistema (registro, onboarding, reserva, pago, cancelación, etc.). |
| [MODELO-DOMINIO.md](./MODELO-DOMINIO.md) | Entidades, relaciones, modelo de datos (ER) y tipos principales del dominio. |
| [INTEGRACION-FRONTEND-BACKEND.md](./INTEGRACION-FRONTEND-BACKEND.md) | Contrato API: endpoints consumidos por el frontend vs. expuestos por el backend, mapeo de servicios y discrepancias. |
| [REGLAS-NEGOCIO.md](./REGLAS-NEGOCIO.md) | Reglas funcionales verificadas: turnos, horarios, límites por plan, suscripciones, pagos, emails. |
| [SEGURIDAD-SISTEMA.md](./SEGURIDAD-SISTEMA.md) | Autenticación, autorización, OTP/2FA, JWT, RLS, riesgos y recomendaciones. |
| [INFRAESTRUCTURA.md](./INFRAESTRUCTURA.md) | Entornos, configuración, despliegue, servicios externos y dependencias. |
| [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md) | Requisitos → componentes, mapeo doc→código→frontera, contradicciones documentadas y vacíos para la tesis. |

---

## 3. Vista de 30 segundos del sistema

```
┌───────────────────────────────┐        ┌──────────────────────────────────────┐
│   Turnexo_front (SPA React)   │  HTTP  │        Turnexo (FastAPI)             │
│   • Marketplace público       │ ─────► │  /api → Routers → Services → Models  │
│   • Reserva de turnos         │  JSON  │  • Auth JWT + 2FA OTP                │
│   • Dashboard del dueño       │        │  • Turnos/agenda + QR + emails       │
│   • Panel admin               │        │  • Planes + pagos (MercadoPago)      │
└───────────────────────────────┘        └──────────────────┬───────────────────┘
                                                            ▼
                                              PostgreSQL 17 (Supabase)
                                              · btree_gist (GiST anti-solape)
                                              · RLS: catálogo público, resto cerrado

Servicios externos:  Resend (emails) · MercadoPago (pagos) · Mapbox (geocodificación + mapa)
                    Google OAuth (login) · Cloudinary (imágenes, frontend) · Vercel (hosting frontend)
```

---

## 4. Convenciones utilizadas en esta carpeta

- **Nomenclatura de dominio:** se usan los nombres de recursos reales de la API
  (`/turnos`, `/negocios`, `/servicios`, `/empleados`, `/horarios`, `/planes`, `/pagos`),
  no las versiones en inglés que quedaron obsoletas en el frontend (ver
  [INTEGRACION-FRONTEND-BACKEND.md](./INTEGRACION-FRONTEND-BACKEND.md) §8).
- **Rutas de código:** se citan las rutas relativas de cada repositorio (p. ej.
  `app/services/turno_service.py` o `src/features/booking/services/appointment.service.ts`).
- **Marcas de contradicción:** se usan cajas `> ⚠️ CONTRADICCIÓN DOCUMENTADA …` para señalar
  desacuerdos entre documentos o entre documento y código. El listado consolidado está en
  [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md) §5.
- **Idioma:** español, con identificadores de código y endpoints en su forma original.

---

## 5. Guía de lectura rápida

- **¿Qué hace el sistema y cómo se estructura?** → `ARQUITECTURA-SISTEMA.md`.
- **¿Cómo se reserva un turno de punta a punta?** → `FLUJO-END-TO-END.md` §4.
- **¿Qué entidades y tablas existen?** → `MODELO-DOMINIO.md`.
- **¿Qué endpoint llama cada pantalla y qué falta?** → `INTEGRACION-FRONTEND-BACKEND.md`.
- **¿Qué restricciones de negocio existen (planes, horarios, límites)?** → `REGLAS-NEGOCIO.md`.
- **¿Cómo se autentica y qué tan segura es la app?** → `SEGURIDAD-SISTEMA.md`.
- **¿Cómo se despliega y qué se necesita configurar?** → `INFRAESTRUCTURA.md`.
- **¿Dónde está cada requisito y qué hay incompleto para la tesis?** → `MATRIZ-TRAZABILIDAD.md`.

---

## 6. Documentación original de referencia (por repositorio)

### Backend `Turnexo/docs/`

| Documento | Se usa en |
|---|---|
| `ARQUITECTURA.md` | Arquitectura de capas, dependencias, servicios externos |
| `ESTRUCTURA.md` | Organización de `app/`, `supabase/`, `tests/` |
| `TECNOLOGIAS.md` | Stack y librerías del backend |
| `API.md` / `ENDPOINTS.md` | Catálogo y detalle de endpoints |
| `BASE_DE_DATOS.md` / `MODELOS.md` | Modelo de datos y ER |
| `AUTENTICACION.md` / `AUTORIZACION.md` / `SEGURIDAD.md` | Seguridad transversal |
| `USUARIOS.md` / `NEGOCIOS.md` / `SERVICIOS.md` / `HORARIOS.md` | Módulos por dominio |
| `RESERVAS.md` / `ESTADOS_TURNO.md` | Turnos y máquina de estados |
| `PLANES.md`→ `SUSCRIPCIONES.md` / `PAGOS.md` | Planes, suscripciones y pagos |
| `EMAILS.md` / `QR.md` | Emails y códigos QR |
| `CONFIGURACION.md` / `DESPLIEGUE.md` / `CHANGELOG.md` | Configuración y despliegue |

> Nota: en el listado real de `docs/` del backend el documento de planes figura como
> `SUSCRIPCIONES.md` (ver su encabezado). No existe `PLANES.md`.

### Frontend `Turnexo_front/docs/`

| Documento | Se usa en |
|---|---|
| `ARQUITECTURA.md` | Arquitectura, flujo de datos, dependencias |
| `ESTRUCTURA.md` / `COMPONENTES.md` | Estructura y componentes relevantes |
| `TECNOLOGIAS.md` / `CONFIGURACION.md` | Stack y configuración (Vite, TS, Tailwind, ESLint) |
| `ROUTING.md` | Mapa de rutas de la SPA |
| `API_CLIENT.md` | ApiClient, errores y transporte |
| `AUTENTICACION.md` | Flujo de auth en el frontend |
| `ESTADO_Y_DATOS.md` / `FLUJO_DATOS.md` | Estado, React Query, persistencia |
| `PAGOS.md` / `QR.md` / `SEGURIDAD.md` | Pagos, QR y seguridad en el cliente |
| `DESPLIEGUE.md` | Despliegue en Vercel |

---

## 7. Datos rápidos

| Aspecto | Valor |
|---|---|
| Categoría del sistema | Reserva de turnos / agenda para comercios (B2C y B2B) |
| Frontend | SPA React 19 + Vite + TypeScript, rutas `/`, `/negocio/:slug`, `/reservar/:slug`, `/dashboard/*`, `/admin/*` |
| Backend | API REST monolítica modular FastAPI bajo prefijo `/api` |
| Base de datos | PostgreSQL 17 en Supabase, esquema `public`, 16 tablas |
| Autenticación | JWT HS256 (60 min) + verificación de email + 2FA por OTP (email) |
| Pagos | MercadoPago Checkout Pro vía preferencias + webhook |
| Emails | Resend (verificación, reset, OTP, confirmación+QR, cancelación) |
| Mapas / geo | Mapbox (geocodificación backend + mapa frontend) |
| Imágenes | Cloudinary (unsigned upload desde el frontend) |
| Hosting | Frontend en Vercel (SPA rewrite); backend sin configuración de hosting en el repo |
| Tests | Backend: pytest (122 tests OK según CHANGELOG); Frontend: Vitest (2 utilidades) |

---

## 8. Estado general y advertencias

El sistema está **funcional en su núcleo** (marketplace, reserva, dashboard, pagos,
emails), pero la documentación de ambos repos revela **áreas incompletas o inconsistentes**,
todas detalladas en esta carpeta:

1. **Autorización por rol parcial** (`require_role("admin")` en mutaciones de catálogo;
   `/usuarios/admin` y otras mutaciones admin sin restringir; `admin_router.py` no montado).
2. **Ownership/IDOR corregido** en `/empleados`, `/horarios`, `/clientes`, `/turnos`,
   `/planes/negocios/{id}/funciones`; quedan expuestos endpoints de mantenimiento de
   `/negocios` (backfills, `/admin`) y `/auth/test-email`.
3. **`/auth/login` sin 2FA obligatoria** (bypass por diseño); el backend sí responde
   `requires_2fa` cuando la 2FA no fue verificada recientemente (verificado 18/08/2026).
4. **Empleados: el frontend usa PUT/PATCH/DELETE que el backend no expone**.
5. **Estado `PENDIENTE` definido pero nunca asignado**; la creación fija `CONFIRMADO`.
6. ~~Webhook de Mercado Pago sin firma; OTP en texto plano; sin rate limiting~~ →
   **resuelto**: webhook con firma `X-Signature` v2 + idempotencia, OTP hasheado (HMAC-SHA256)
   con lockout, rate limiting en login/register/2FA/forgot.
7. **Frontend con legado de endpoints en inglés** (`/businesses`, `/appointments`, …) sin uso.

Estos puntos se expanden en cada documento y se consolidan en
[MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md).