# Despliegue — TurnoGo Frontend

Documentación de **cómo se despliega actualmente** el frontend, basada únicamente en
archivos de configuración y scripts del repositorio.

---

## 1. Plataforma de despliegue

| Aspecto | Detalle |
|---------|---------|
| **Plataforma** | **Vercel** (evidenciado por `vercel.json` en raíz) |
| **Tipo** | SPA (Single Page Application) con rewrite a `index.html` |
| **Build command** | `pnpm run build` → `tsc -b && vite build` |
| **Output directory** | `dist/` (default de Vite) |
| **Node version** | No especificada en repo (Vercel usa default 18.x/20.x) |

---

## 2. Configuración de Vercel

Archivo: `vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

| Propósito | Explicación |
|-----------|-------------|
| **SPA Rewrite** | Todas las rutas (`/dashboard/turnos`, `/negocio/xyz`, etc.) sirven `index.html` para que React Router maneje el routing client-side |
| **Sin headers custom** | No hay configuración de `headers`, `cleanUrls`, `trailingSlash`, etc. |

---

## 3. Build process

### 3.1 Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  }
```

| Script | Qué hace |
|--------|----------|
| `dev` | Levanta Vite dev server (HMR) |
| `build` | 1. `tsc -b` (type-check completo con project references) 2. `vite build` (bundle producción en `dist/`) |
| `lint` | ESLint 9 flat config sobre todo el workspace |
| `test` | Vitest run (jsdom, globals, setup file) |
| `test:watch` | Vitest en modo watch |
| `preview` | Sirve `dist/` localmente para validar build |

### 3.2 Build de Vite (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { /* vitest config */ }
});
```

| Aspecto | Configuración |
|---------|---------------|
| Plugin | `@vitejs/plugin-react` (React 19 + Fast Refresh) |
| Alias | `@` → `./src` |
| Minificación | **Default de Vite** (esbuild) — no configurado `build.minify` |
| Code splitting | **Default** (dynamic imports / `React.lazy` generan chunks) |
| Source maps | **Default** (`.map` generados en `dist/`) — no deshabilitado |
| Assets | Hash en nombres (`[hash]` default) |
| Public folder | `public/` copiado tal cual a `dist/` |

### 3.3 Type-check previo (`tsc -b`)

Ejecuta TypeScript en modo **build** con project references:
- `tsconfig.app.json` (código app)
- `tsconfig.node.json` (config herramientas)

Falla el build si hay errores de tipos.

---

## 4. Variables de entorno en despliegue

### 4.1 En Vercel (Project Settings → Environment Variables)

| Variable | Entorno | Descripción |
|----------|---------|-------------|
| `VITE_API_URL` | Production / Preview / Development | URL del backend (ej. `https://api.turnego.com`) |
| `VITE_AUTH_API_ROOT` | Opcional | Override de root auth (default: `${VITE_API_URL}/api/auth`) |
| `VITE_MAPBOX_TOKEN` | Requerida | Token público Mapbox |
| `VITE_CLOUDINARY_CLOUD_NAME` | Requerida | Cloud name Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Requerida | Upload preset unsigned |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Requerida | Public key MP (distinta para sandbox/prod) |
| `VITE_GOOGLE_CLIENT_ID` | **Requerida si se usa Google OAuth** | **Actualmente ausente en local** |

> **Importante**: En Vercel, las variables `VITE_*` se inyectan en **build time** (no runtime). Cada deploy con nuevas vars requiere rebuild.

### 4.2 En desarrollo local (`.env.local`)

```bash
VITE_API_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=pk.xxx
VITE_CLOUDINARY_CLOUD_NAME=mi-cloud
VITE_CLOUDINARY_UPLOAD_PRESET=mi-preset
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
# VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com  # AUSENTE
```

Archivo **no versionado** (`.gitignore` incluye `.env` y `*.local`).

---

## 5. Desarrollo local

### 5.1 Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js | 18+ (recomendado 20 LTS) |
| pnpm | 8+ (lockfile `pnpm-lock.yaml`) |

### 5.2 Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo con HMR
pnpm run dev
# → http://localhost:5173 (default Vite)

# Type-check + build local
pnpm run build

# Preview del build local
pnpm run preview
# → http://localhost:4173

# Tests
pnpm run test
pnpm run test:watch

# Lint
pnpm run lint
```

### 5.3 Puertos y proxy

| Config | Valor |
|--------|-------|
| Puerto dev server | `5173` (default Vite) — configurable en `vite.config.ts` (`server.port`) |
| Proxy API | **No configurado** — frontend apunta directo a `VITE_API_URL` (CORS en backend) |
| HTTPS local | No configurado (usa HTTP) |

---

## 6. Estructura del build output (`dist/`)

```
dist/
├── index.html              # HTML minificado con hashes en assets
├── assets/
│   ├── index-[hash].js     # Bundle principal (code-split en chunks)
│   ├── index-[hash].css    # CSS extraído + hashes
│   ├── vendor-[hash].js    # Chunk de dependencias (react, router, etc.)
│   ├── [chunk]-[hash].js   # Chunks lazy (Planes, MiSuscripcion, ResultadoPago)
│   └── [asset]-[hash].[ext] # Imágenes, fuentes, etc.
├── .vite/                  # Manifest de assets (para SSR si se usara)
└── public/                 # Copia de public/ (icon.png, icon.ico)
```

**Chunks lazy detectados** (desde `App.tsx`):
- `Planes` → chunk separado
- `MiSuscripcion` → chunk separado
- `ResultadoPago` → chunk separado

---

## 7. Producción vs Desarrollo

| Aspecto | Desarrollo (`pnpm dev`) | Producción (`pnpm build`) |
|---------|-------------------------|---------------------------|
| Source maps | Sí (inline/eval) | Sí (`.map` files en `dist/`) |
| Minificación | No | Sí (esbuild) |
| React DevTools | Habilitado | Deshabilitado (`production` build) |
| React Fast Refresh | Sí | No |
| Console logs | Visibles | Presentes (no hay `drop_console`) |
| Type-check | Continuo (TS server) | `tsc -b` previo al build |
| Variables env | `.env.local` | Inyectadas por Vercel en build |
| Puerto | 5173 | N/A (static files) |
| HTTPS | No | Sí (Vercel provee cert) |

---

## 8. Checklist de despliegue a Vercel

| Paso | Comando / Acción |
|------|------------------|
| 1. Conectar repo | Import Project en Vercel → selecciona repo Git |
| 2. Framework preset | **Vite** (auto-detectado) |
| 3. Build command | `pnpm run build` (auto) |
| 4. Output directory | `dist` (auto) |
| 5. Install command | `pnpm install` (auto por `pnpm-lock.yaml`) |
| 6. Variables de entorno | Agregar todas las `VITE_*` en Project Settings |
| 7. Deploy | Push a `main` / `production` branch → auto-deploy |

> **Nota**: `vercel.json` ya está en repo → rewrite SPA aplicado automáticamente.

---

## 8. Rollback y versionado

| Mecanismo | Detalle |
|-----------|---------|
| **Deployments inmutables** | Cada push genera deployment único con URL única (`xxx.vercel.app`) |
| **Rollback** | En dashboard Vercel → "Promote to Production" deployment anterior |
| **Preview deployments** | Cada PR/branch genera preview URL automática |
| **Cache busting** | Hashes en nombres de assets (`index-[hash].js`) |
| **Versión app** | No hay versionado automático (no `package.json` version en UI) |

---

## 9. Observaciones y deuda de despliegue

| Aspecto | Estado | Comentario |
|---------|--------|------------|
| **Source maps en prod** | Generados | Exponen código original; considerar `build.sourcemap: false` si sensible |
| **Console.log en prod** | Presentes | No hay `drop_console` en `vite.config.ts` |
| **Compression (gzip/brotli)** | Vercel auto | Vercel sirve comprimido automáticamente |
| **Cache headers** | Vercel default | `Cache-Control` para assets hasheados = `immutable` |
| **SPA fallback** | Configurado | `vercel.json` rewrite |
| **Edge Functions / Middleware** | No usado | Solo static hosting |
| **Analytics / Web Vitals** | No integrado | No `vercel/analytics` ni `web-vitals` |
| **Error tracking** | No integrado | No Sentry, LogRocket, etc. |
| **Health check endpoint** | No existe | Solo static files |

---

## 10. Archivos relevantes para despliegue

| Archivo | Qué define |
|---------|------------|
| `vercel.json` | SPA rewrite |
| `vite.config.ts` | Build config, alias, test |
| `package.json` | Scripts, dependencias, engines (no especificado) |
| `pnpm-lock.yaml` | Lockfile exacto |
| `.env.local` | Variables desarrollo (no versionado) |
| `tsconfig.app.json` | Type-check estricto previo a build |
| `index.html` | Entry point HTML + SEO meta |
| `public/` | Assets estáticos copiados tal cual |
| `dist/` | Output build (gitignoreado) |

---

## 11. Comandos de verificación post-deploy

```bash
# Verificar build local antes de push
pnpm run lint && pnpm run build

# Verificar tipos sin build
pnpm run tsc -b  # o npx tsc --noEmit

# Ejecutar tests
pnpm run test

# Preview local del build
pnpm run preview
```