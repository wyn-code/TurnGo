# Configuración del proyecto — TurnoGo Frontend

Documentación de **todas las configuraciones** del proyecto. Solo se documenta lo que existe en los archivos de configuración.

---

## 1. Variables de entorno

Archivo: `.env.local` (gitignoreado). No se versionan secretos.

| Variable | Descripción | Requerida | Donde se usa |
|----------|-------------|-----------|--------------|
| `VITE_API_URL` | Host del backend (sin `/api`). Default: `http://localhost:8000` | No (tiene default) | `src/lib/api-config.ts` |
| `VITE_AUTH_API_ROOT` | Raíz del servicio de auth. Default: `${API_BASE_URL}/auth` | No (tiene default) | `src/lib/api-config.ts` |
| `VITE_MAPBOX_TOKEN` | Token público de Mapbox GL | Sí (para mapas) | `src/features/business/components/Map.tsx` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary | Sí (para subida imágenes) | `src/lib/cloudinary.ts`, `src/components/ui/image-upload.tsx` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Upload preset (unsigned) de Cloudinary | Sí | `src/lib/cloudinary.ts`, `src/components/ui/image-upload.tsx` |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Public key de Mercado Pago | Sí (para pagos) | `src/lib/mercadopago.ts` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth | Referenciada en código | `src/features/auth/components/SocialAuthButtons.tsx` |

> **Nota**: `VITE_GOOGLE_CLIENT_ID` **no está presente en `.env.local`** del entorno analizado. El botón de Google OAuth no funcionará sin ella.

---

## 2. Configuración de Vite

Archivo: `vite.config.ts`

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/statistics-utils.ts", "src/utils/format.ts"],
    },
  },
});
```

| Aspecto | Configuración |
|---------|---------------|
| Plugin | `@vitejs/plugin-react` (React 19 + Fast Refresh) |
| Alias | `@` → `./src` |
| Test runner | Vitest (globals, jsdom, setup file) |
| Coverage | v8, solo `statistics-utils.ts` y `format.ts` |

---

## 3. Configuración de TypeScript

### 3.1 `tsconfig.json` (root)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Proyecto compuesto con dos sub-proyectos.

### 3.2 `tsconfig.app.json` (código de la app)

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] },
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

| Opción | Valor | Efecto |
|--------|-------|--------|
| `strict` | `true` | Todas las comprobaciones estrictas |
| `noUnusedLocals/Parameters` | `true` | Error en código no usado |
| `verbatimModuleSyntax` | `true` | Imports/exports exactos (ESM puro) |
| `erasableSyntaxOnly` | `true` | Solo sintaxis que se borra en runtime |
| `noEmit` | `true` | Solo type-check (Vite hace emit) |
| `moduleResolution: "bundler"` | | Resolución estilo bundler |
| `target: "ES2023"` | | Output ES2023 |

### 3.3 `tsconfig.node.js` (config de Node/ herramienta)

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

## 4. Configuración de Tailwind CSS

Archivo: `tailwind.config.js`

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      shimmer: { '100%': { transform: 'translateX(100%)' } },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

| Aspecto | Detalle |
|---------|---------|
| **Content** | `index.html` + `src/**/*` |
| **Tema** | Variables CSS (`hsl(var(--...))`) — compatibilidad shadcn/ui |
| **Colores** | Paleta completa: primary, secondary, destructive, muted, accent, popover, card, sidebar |
| **Border radius** | Variables `--radius` (lg/md/sm) |
| **Animación custom** | `shimmer` para skeleton loading |
| **Plugins** | `[]` (vacío) — **`tailwindcss-animate` y `@tailwindcss/typography` instalados pero no registrados** |

---

## 5. Configuración de React

| Archivo | Configuración |
|---------|---------------|
| `src/main.tsx` | `createRoot(document.getElementById("root")!).render(<App />)` — **sin `StrictMode`** |
| `src/App.tsx` | Providers: `QueryClientProvider` → `TooltipProvider` → `BrowserRouter` → `AuthProvider` → `MembershipProvider` → `Suspense` → rutas |
| `index.html` | `<div id="root"></div>` + meta tags SEO/OG |
| `index.css` | Tokens CSS (`:root` + `.dark`), fuentes Google Fonts (Inter + Space Grotesk), animaciones (`page-enter`, `scroll-reveal`, `fade-in`), `prefers-reduced-motion` |

### 5.1 Tokens CSS (`src/index.css:8-86`)

Variables CSS definidas para light (`:root`) y dark (`.dark`):

```css
:root {
  --background: 0 0% 99%;
  --foreground: 240 10% 8%;
  --primary: 258 60% 52%;
  --primary-foreground: 0 0% 100%;
  --radius: 0.75rem;
  /* ... paleta completa ... */
}
.dark {
  --background: 240 10% 6%;
  --foreground: 0 0% 95%;
  --primary: 258 60% 60%;
  /* ... variante dark ... */
}
```

### 5.2 Animaciones (`src/index.css:104-254`)

| Clase | Propósito |
|-------|-----------|
| `.page-enter` | Transición de entrada de página (280ms) |
| `.scroll-reveal` + `.is-visible` | IntersectionObserver reveal |
| `.fade-in` + `:nth-child(n)` | Staggered fade-in |
| `@media (prefers-reduced-motion: reduce)` | Desactiva animaciones |

---

## 6. Configuración de PostCSS

Archivo: `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Solo `tailwindcss` + `autoprefixer`. No hay `postcss-nested`, `cssnano`, etc.

---

## 7. Configuración de ESLint

Archivo: `eslint.config.js` (ESLint 9 flat config)

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
```

| Aspecto | Config |
|---------|--------|
| Formato | Flat config (ESLint 9) |
| Extends | `js.recommended`, `typescript-eslint.recommended`, `react-hooks.recommended`, `react-refresh.vite` |
| Ignora | `dist/` |
| Parser | TypeScript ESLint (implícito) |

---

## 8. Configuración de shadcn/ui

Archivo: `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

| Clave | Valor |
|-------|-------|
| `style` | `default` |
| `rsc` | `false` (no React Server Components) |
| `baseColor` | `slate` |
| `cssVariables` | `true` |
| `aliases` | Mapea `@/components`, `@/lib`, `@/hooks`, `@/components/ui`, `@/lib/utils` |

---

## 8. Configuración de Vitest

En `vite.config.ts` (sección `test`):

```typescript
test: {
  globals: true,
  environment: "jsdom",
  setupFiles: ["./src/test/setup.ts"],
  include: ["src/**/*.test.{ts,tsx}"],
  coverage: {
    provider: "v8",
    include: ["src/lib/statistics-utils.ts", "src/utils/format.ts"],
  },
}
```

| Aspecto | Valor |
|---------|-------|
| Globals | `true` (expect, describe, it globales) |
| Environment | `jsdom` |
| Setup file | `src/test/setup.ts` (importa `@testing-library/jest-dom`) |
| Include | `src/**/*.test.{ts,tsx}` |
| Coverage | v8, solo 2 archivos |

Archivo `src/test/setup.ts`:

```typescript
import "@testing-library/jest-dom";
import { vi } from "vitest";
```

---

## 9. Configuración de pnpm

Archivo: `pnpm-workspace.yaml`

```yaml
allowBuilds:
  esbuild: true
```

Permite build nativo de `esbuild` (dependencia de Vite).

---

## 9. Configuración de Vercel

Archivo: `vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**SPA rewrite**: todas las rutas → `index.html` (necesario para React Router en Vercel).

---

## 10. Resumen de archivos de configuración

| Archivo | Propósito |
|---------|-----------|
| `.env.local` | Secrets (no versionado) |
| `vite.config.ts` | Build + test + alias |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TypeScript estricto |
| `tailwind.config.js` | Tema + colores CSS variables |
| `postcss.config.js` | Tailwind + autoprefixer |
| `eslint.config.js` | Lint TypeScript + React |
| `components.json` | shadcn/ui registry |
| `tsconfig.node.json` | Config para vite.config.ts |
| `vercel.json` | SPA rewrite |
| `pnpm-workspace.yaml` | Build esbuild |
| `index.html` | Entry HTML + SEO |
| `src/index.css` | Tokens CSS + animaciones + fuentes |