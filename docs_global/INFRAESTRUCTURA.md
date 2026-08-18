# INFRAESTRUCTURA — TurnoGo

Entornos, configuración, despliegue, servicios externos y dependencias del sistema completo.
Solo se documenta lo que existe en los repositorios; cuando algo **no** está definido se indica
explícitamente.

Fuentes: `docs/CONFIGURACION.md`, `docs/DESPLIEGUE.md`, `docs/TECNOLOGIAS.md`,
`docs/ESTRUCTURA.md` (backend); `docs/CONFIGURACION.md`, `docs/DESPLIEGUE.md`,
`docs/TECNOLOGIAS.md` (frontend).

---

## 1. Topología

```
                    ┌─────────────────────────────────────────────┐
                    │  Vercel (SPA)                                │
                    │  Turnexo_front · React 19 · vercel.json      │
                    │  rewrites: /(.*) → /index.html               │
                    └───────────────┬─────────────────────────────┘
                                    │ HTTP / JSON (CORS: 5173, www.turnogo.app, turnogo.app)
                                    ▼
                    ┌─────────────────────────────────────────────┐
                    │  Backend FastAPI (Turnexo)                   │
                    │  uvicorn app.main:app · /api/*               │
                    │  (hosting NO definido en el repo)            │
                    └───────────────┬─────────────────────────────┘
                                    ▼
                    ┌─────────────────────────────────────────────┐
                    │  PostgreSQL 17 — Supabase                    │
                    │  · esquema public · RLS catálogo público     │
                    │  · extensión btree_gist (GiST anti-solape)   │
                    └─────────────────────────────────────────────┘

Servicios externos:  Resend · MercadoPago · Mapbox · Google OAuth · Cloudinary
```

---

## 2. Variables de entorno

### 2.1 Backend (`Turnexo/.env`, leídas con `python-decouple`)

| Variable | Obligatoria | Uso |
|---|---|---|
| `DB` | Sí | URL de conexión PostgreSQL (Supabase) |
| `SECRET_KEY` | Sí (sin default) | firma HS256 de los JWT |
| `RESEND_API_KEY` | Sí | emails (Resend) |
| `MAPBOX_ACCESS_TOKEN` | Sí | geocodificación |
| `BACKEND_URL` | Sí | `notification_url` del webhook de MP |
| `MERCADOPAGO_ACCESS_TOKEN` | Sí | pagos (`TEST-*` = modo test) |
| `GOOGLE_CLIENT_ID` | Sí | validación de `id_token` de Google |
| `GOOGLE_CLIENT_SECRET` | Configurada | **sin uso directo** detectado en el flujo actual |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No (default 60) | validez del JWT |
| `TWO_FACTOR_TOKEN_EXPIRE_HOURS` | No (default 9) | TTL OTP / "recordar 2FA" |
| `FRONTEND_URL` | No (default `https://www.turnogo.app`) | enlaces de email, back_urls, QR |

- No existe `env.example`/`.env.example` versionado. `.env` y `.env.*` están en `.gitignore`.

### 2.2 Frontend (`Turnexo_front/.env.local`, consumidas con `import.meta.env`)

| Variable | Default | Uso |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | host del backend (sin `/api`) |
| `VITE_AUTH_API_ROOT` | `${API_BASE_URL}/auth` | raíz del servicio de auth |
| `VITE_MAPBOX_TOKEN` | — | Mapbox GL (mapa) |
| `VITE_CLOUDINARY_CLOUD_NAME` | — | Cloudinary (imágenes) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | — | upload preset (unsigned) |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | — | Mercado Pago (SDK público) |
| `VITE_GOOGLE_CLIENT_ID` | — | **no presente** en `.env.local` analizado → botón Google no funciona |

---

## 3. Desarrollo local

### 3.1 Backend

- Instalar dependencias: `pip install -r requirements.txt` (Python 3; existe `venv/`).
- Crear `.env` con las variables de §2.1.
- Supabase local (CLI, `supabase/config.toml`): Postgres en `54322` (v17), PostgREST en `54321`
  (`max_rows=1000`), Studio `54323`, Inbucket `54324` (emails de prueba), Analytics `54327`.
- Aplicar migraciones `supabase/migrations/*.sql`.
- Arranque: `uvicorn app.main:app` (punto de entrada `app.main:app`).
- Verificación: `GET /` → `{"mensaje": "API Turnogo funcionando"}`; `GET /db-test` →
  `"conexion OK con postgres"`; Swagger en `/docs`.
- Pagos en test: token `TEST-…` (el service elige `sandbox_init_point`).

### 3.2 Frontend

- Gestor: **pnpm** (`pnpm-workspace.yaml` permite build nativo de esbuild).
- Comandos: `pnpm install`, `pnpm dev` (Vite, puerto 5173 — coincide con CORS del backend).
- Tests: Vitest + jsdom; coverage solo en `src/lib/statistics-utils.ts` y `src/utils/format.ts`.

---

## 4. Build y despliegue

### 4.1 Backend

| Recurso | Estado en el repo |
|---|---|
| Punto de entrada ASGI | `app.main:app` definido ✔ |
| Comando de corrida en producción | **No definido** (sin `start.sh`, Procfile, gunicorn) |
| Docker | `Dockerfile` y `docker-compose.yml` **vacíos** (0 bytes) |
| Alembic | scripts en `alembic/versions/` pero **sin** `alembic.ini`/`env.py` |
| Hosting | **No definido** (Vercel/Railway/Fly/Render no configurados) |
| CI/CD | No hay manifiestos de pipeline |
| Migraciones | `supabase/migrations/*.sql` listas para aplicar (incl. RLS) |

### 4.2 Frontend

- Build: `pnpm build` (Vite → `dist/`).
- Despliegue: **Vercel** con `vercel.json` (SPA rewrite `/(.*) → /index.html`).
- No usa SSR (`rsc: false`); SEO vía meta tags.

---

## 5. Servicios externos y configuración en producción

| Servicio | Config necesaria | Notas |
|---|---|---|
| Resend | `RESEND_API_KEY` | emails transaccionales |
| MercadoPago | `MERCADOPAGO_ACCESS_TOKEN`, `BACKEND_URL`, `FRONTEND_URL` | webhook público en `{BACKEND_URL}/api/pagos/webhook` |
| Google | `GOOGLE_CLIENT_ID` (y `GOOGLE_CLIENT_SECRET` en config, sin consumo) | login con `id_token` |
| Mapbox | `MAPBOX_ACCESS_TOKEN` (backend) / `VITE_MAPBOX_TOKEN` (frontend) | geocoding + mapa |
| Cloudinary | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | subida unsigned desde el frontend |
| PostgreSQL | `DB` | Supabase (v17) |

---

## 6. Dependencias

### 6.1 Backend (`requirements.txt`)

| Categoría | Librerías |
|---|---|
| Web | `fastapi>=0.135.3`, `uvicorn>=0.44.0`, `python-multipart` |
| DB | `sqlalchemy>=2.0.49`, `psycopg2-binary>=2.9.11` |
| Auth | `bcrypt`, `passlib>=1.7.4`, `python-jose>=3.5.0`, `pyjwt>=2.13.0`, `google-auth>=2.29.0`, `email-validator`, `cryptography` |
| Config | `python-decouple>=3.8`, `python-dotenv` |
| Servicios externos | `resend>=2.30.1`, `mercadopago==3.3.0`, `requests>=2.34.1`, `qrcode[pil]>=8.0`, `apscheduler` (importado, sin requirement) |
| Dev | `pytest`, `pylint>=4.0.6` |

> `apscheduler` se importa en `scheduler_wsp` pero **no** figura en `requirements.txt` y el
> scheduler no se arranca en `main.py`.

### 6.2 Frontend (`package.json`)

| Categoría | Librerías (documentadas) |
|---|---|
| Core | React 19, React Router 7, TypeScript ~5.9, Vite |
| Datos | TanStack React Query 5, React Hook Form, Zod |
| UI | Tailwind CSS ~3.4, shadcn/ui (Radix), recharts, `cmdk`, `vaul`, `react-day-picker`, sonner |
| Integraciones | Mapbox GL, Cloudinary (fetch), MercadoPago (SDK), Google Identity |
| Calidad | ESLint 9 (flat), Vitest, `@testing-library/jest-dom` |

---

## 7. Checklist antes de desplegar (consolidado)

1. Definir en el entorno **todas** las variables obligatorias del backend (§2.1), incluida
   `SECRET_KEY` (sin default, ≥256 bits) y `BACKEND_URL` pública.
2. Aplicar migraciones SQL contra la BD remota, incluida `20260812120000_rls_politicas.sql`.
3. Exponer el backend para que MercadoPago alcance `/api/pagos/webhook`.
4. Configurar el frontend: `VITE_API_URL`, `VITE_MAPBOX_TOKEN`, Cloudinary, MP public key, y
   `VITE_GOOGLE_CLIENT_ID` si se quiere el login de Google.
5. Decidir el **hosting del backend** y el comando de corrida (hoy indefinido).
6. Restringir en producción: `/docs`, `/db-test`, `/auth/test-email`, backfills de `/negocios`
   (recomendaciones de [SEGURIDAD-SISTEMA.md](./SEGURIDAD-SISTEMA.md)).

---

## 8. Brechas de infraestructura para la tesis

| Brecha | Impacto |
|---|---|
| Hosting/comando de producción del backend indefinido | No se puede reproducir el despliegue real |
| `Dockerfile`/`docker-compose.yml` vacíos | Sin imagen de contenedor |
| Alembic sin `env.py`/`ini` | Las migraciones solo son SQL de Supabase |
| `apscheduler` sin requirement y sin arranque | Recordatorios de turnos no activos |
| `VITE_GOOGLE_CLIENT_ID` ausente | Login de Google roto en el cliente |
| Sin CI/CD documentado | Sin pipeline de build/test/deploy |