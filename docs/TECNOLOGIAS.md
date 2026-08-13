# Tecnologías del frontend — TurnoGo

Documento de referencia del stack técnico realmente utilizado por la SPA.
Las versiones citadas corresponden a `package.json` (semver aceptada en el
momento del análisis).

## 1. Resumen del stack

```mermaid
flowchart TB
    subgraph NUCLEO["Núcleo"]
        R[React 19]
        TS[TypeScript 5.9 estricto]
        V[Vite 8]
        RR[React Router 7]
        RQ[TanStack React Query 5]
    end
    subgraph ESTILO["Estilo"]
        TW[Tailwind CSS 3.4]
        SH[shadcn/ui + Radix UI]
        LC[lucide-react]
        RC[recharts]
    end
    subgraph FORMS["Formularios"]
        RHF[React Hook Form 7]
        Z[Zod 4]
        HR[@hookform/resolvers]
    end
    subgraph INT["Integraciones"]
        MP[@mercadopago/sdk-react]
        MB[mapbox-gl]
        QR[qrcode.react]
        CLD[Cloudinary vía fetch]
    end
    subgraph TEST["Testing"]
        VT[Vitest 4]
        TL[Testing Library + jest-dom + jsdom]
    end

    R --> RR
    R --> RQ
    R --> RHF
    RHF --> Z
    RHF --> HR
    SH --> TW
    SH --> LC
    RC --> SH
    MP --> R
    MB --> R
    QR --> R
```

## 2. Núcleo de la aplicación

### 2.1 React (^19.2.4)

Biblioteca de UI base. Características usadas en el código:

- **Hooks**: `useState`, `useEffect`, `useReducer` (no se detecta), `useMemo`,
  `useCallback`, `useRef`, `useContext`.
- **Context API**: para estado global (`AuthProvider`, `MembershipProvider`,
  `DashboardBusinessProvider`).
- **Lazy loading** con `React.lazy` + `Suspense` (`src/App.tsx:19-21`).
- **StrictMode**: no está habilitado en `main.tsx` (render directo de `<App />`).
- **Error Boundary**: clase `src/components/error-boundary.tsx`.
- `React.useMemo`/`React.memo` se usan de forma selectiva (p. ej.
  `BookingSummary` no memoiza; se prioriza composición simple).

Referencias: `src/App.tsx`, `src/main.tsx`, `src/features/*`.

### 2.2 TypeScript (~5.9.3)

Configuración estricta en `tsconfig.app.json`:

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`.
- `moduleResolution: "bundler"`, `module: "ESNext"`, `target ES2023`.
- `verbatimModuleSyntax: true` → imports de tipos con `import type`.
- `paths: {"@/*": ["./src/*"]}` con el alias de Vite.
- Tipos propios del backend en `src/types/api.ts` y `src/types/statistics.ts`.

### 2.3 Vite (^8.0.2)

- Plugin: `@vitejs/plugin-react`.
- Alias `@` → `./src` (`vite.config.ts`).
- Build: `tsc -b && vite build` (`package.json`).
- Bloque `test` (Vitest) embebido en la misma config (ver §9).

### 2.4 React Router (^7.13.1)

Enrutamiento declarativo de la SPA:

- `BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useLocation`,
  `useParams`, `useSearchParams`, `Link`, `Navigate`.
- Rutas con parámetros (`/negocio/:slug`, `/reservar/:slug`), rutas anidadas
  (`/dashboard/*`, `/admin/*`) y catch-all.
- `location.state.from` para redirección post-login.
- Ver todas las rutas en `src/App.tsx`.

### 2.5 TanStack React Query (^5.94.5)

Capa de datos del servidor:

- `QueryClient` + `QueryClientProvider` en `src/App.tsx`.
- Queries: `useServices`, `useEmployees`, `useHorarios`, `useAppointments`,
  `useStatistics`, `usePlanes`, `useFuncionesNegocio`, `useSuscripcionActual`,
  `useBusinesses`, `useMyBusiness`, `useBusinessBySlug`, `useCategories`.
- Mutations: servicios/empleados/horarios/negocio/membresía (ver
  `src/hooks/mutations/` y `src/features/membership/hooks/useMembershipMutations.ts`).
- Patrones: `staleTime`, `gcTime`, `enabled`, `keepPreviousData`,
  `invalidateQueries`, `setQueryData` (caché optimista selectivo).

Detalle adicional en `ARQUITECTURA.md` §7.

## 3. Estilo y UI

### 3.1 Tailwind CSS (^3.4.19)

- Configuración en `tailwind.config.js`: paleta basada en variables CSS
  (`hsl(var(--primary))`, etc.), tokens de redondeo, bright `shimmer`.
- `src/index.css` define las variables (`:root` y `.dark`) y clases de
  animación (`page-enter`, `scroll-reveal`, `fade-in`).
- PostCSS: `tailwindcss` + `autoprefixer` (`postcss.config.js`).

### 3.2 shadcn/ui + Radix UI

- Registro en `components.json` (style *default*, base color *slate*,
  `cssVariables: true`).
- Componentes en `src/components/ui/*` construidos sobre primitivas de
  **Radix UI** (`@radix-ui/react-*`, ~30 paquetes declarados).
- Dependencias auxiliares usadas: `class-variance-authority` (variantes con
  `cn`/`cva`), `clsx` y `tailwind-merge` (función `cn` en `src/lib/utils.ts`).
- Nota: `tailwindcss-animate` está en `package.json` pero **no aparece en
  `plugins` de `tailwind.config.js`** ni como import CSS en `index.css`
  (clases `animate-in` se usan en JSX; su soporte depende de la configuración
  final del build).

### 3.3 lucide-react (^0.577.0)

Librería de iconos SVG como componentes React; es la biblioteca de iconos más
usada del proyecto (~75 archivos la importan). Ejemplos: `ArrowLeft`,
`Calendar`, `Clock`, `User`, `CheckCircle2`, `AlertCircle`, `Search`,
`Loader2`, `ShieldCheck`, etc.

### 3.4 recharts (^3.8.0)

Gráficos del módulo de estadísticas:

- `src/components/ui/chart.tsx` es el *wrapper* reutilizable (piezas `Chart*`).
- `src/features/dashboard/components/stats/StatsCharts.tsx` y las pestañas
  `ResumenTab`, `IngresosTab`, `AgendaTab`, `AsistenciaTab`, `EmpleadosTab`
  consumen el wrapper para barras, líneas y donas.

### 3.5 Componentes de UI adicionales (verificados)

| Librería | Uso real |
|----------|----------|
| `date-fns` (^4.1.0) | Formato de fechas en `es` en reserva, calendario y resumen (`Reservar.tsx`, `BookingSummary.tsx`). |
| `react-day-picker` (^9.14.0) | Wrapper del calendario `src/components/ui/calendar.tsx`. |
| `sonner` (^2.0.7) | Toasts de éxito/error en casi todo el proyecto (`toast.success/error`). Provider en `App.tsx`. |
| `embla-carousel-react` (^8.6.0) | Carrusel `src/components/ui/carousel.tsx`. |
| `vaul` (^1.1.2) | Drawer `src/components/ui/drawer.tsx`. |
| `cmdk` (^1.1.1) | Command palette `src/components/ui/command.tsx`. |
| `input-otp` (^1.4.2) | Campo OTP en `src/components/ui/input-otp.tsx` y `VerificarCodigo.tsx`. |
| `react-resizable-panels` (^4.7.4) | Paneles redimensionables `src/components/ui/resizable.tsx`. |
| `@radix-ui/react-toast` | Toaster Radix `src/components/ui/toast.tsx`/`toaster.tsx`/`use-toast.ts`. |

## 4. Formularios y validaciones

### 4.1 React Hook Form (^7.71.2)

- `RegisterLogin`/`Registro.tsx`/`RestablecerContrasena.tsx`/
  `VerificarCodigo.tsx` (integraciones en `src/features/auth/pages/*`).
- Wizard de 7 pasos en `src/features/register-business/pages/RegistrarNegocio.tsx`
  (validación por paso con `trigger(fieldsPerStep[step])`).
- Componente `src/components/ui/form.tsx` da los wrappers
  `FormField`/`FormItem` integrados con RHF.

### 4.2 Zod (^4.3.6)

Esquemas de validación en `src/features/register-business/schema.tsx`,
`src/features/auth/pages/Login.tsx` (schema inline) y
`src/features/auth/pages/Registro.tsx`. Combinado con React Hook Form vía
`@hookform/resolvers` (`zodResolver`).

## 5. Integraciones externas

| Librería / tecnología | Rol en el código |
|-----------------------|------------------|
| `@mercadopago/sdk-react` (^1.0.7) | Solo `initMercadoPago` con public key y locale `es-AR` (`src/lib/mercadopago.ts`). El pago se resuelve por **redirect** a `init_point` (`Planes.tsx`), sin Wallet/Bricks. |
| `mapbox-gl` (^3.24.0) | Mapa del negocio con marker + popup (`src/features/business/components/Map.tsx`); CSS importado en `src/App.tsx`. |
| `qrcode.react` (^4.2.0) | Genera el QR del turno confirmado (`src/features/booking/components/BookingSummary.tsx`). |
| Cloudinary (directo) | Subida de imágenes `POST api.cloudinary.com/.../image/upload` con upload preset (`src/components/ui/image-upload.tsx`, `src/lib/cloudinary.ts`). |
| Google (global `google.accounts.id`) | Botón "Continuar con Google" en `src/features/auth/components/SocialAuthButtons.tsx`. **El SDK no se carga en el HTML** y `VITE_GOOGLE_CLIENT_ID` no está en `.env.local` (ver TECNOLOGIAS §6 y ARQUITECTURA §10). |

## 6. Dependencias instaladas pero NO utilizadas en `src/`

Verificado por búsqueda de imports:

| Paquete | Uso esperado | Estado |
|---------|--------------|--------|
| `@react-oauth/google` (^0.13.5) | OAuth de Google con hook | **0 imports**; se usa el global `google.accounts.id` manual. |
| `next-themes` (^0.4.6) | Tema claro/oscuro | **0 imports**; modo oscuro solo presente como CSS en `index.css`. |
| `@playwright/test` (^1.58.2) | E2E | Instalado; **sin `playwright.config` ni tests** en el repo. |
| `@tailwindcss/typography` (^0.5.19) | clases `prose` | Instalado; **0 usos** de `prose` y no está en `plugins` de Tailwind. |
| `tailwindcss-animate` (^1.0.7) | animaciones Tailwind | Instalado; **no registrado** en `tailwind.config.js` (ver §3.2). |
| `@types/babel__core` (^7.20.5) | tipos de Babel | Solo devDependency; no usado directamente en `src`. |

## 7. Testing

### 7.1 Vitest (^4.1.0)

- Configurado dentro de `vite.config.ts` (`test.globals`, `environment: "jsdom"`,
  `setupFiles: ["./src/test/setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}"]`).
- Scripts: `test` → `vitest run`; `test:watch` → `vitest`.
- **Cobertura** (v8) acotada a `src/lib/statistics-utils.ts` y `src/utils/format.ts`.

### 7.2 Testing Library + jest-dom

- `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` como
  *devDependencies*; se usan en los tests de páginas de auth
  (`RestablecerContrasena.test.tsx`, `VerificarCodigo.test.tsx`) y en el setup.

### 7.3 Tests existentes (módulos cubiertos)

- `src/lib/statistics-utils.test.ts` (motor de estadísticas).
- `src/utils/format.test.ts` (utilidades de formato).
- `src/features/auth/pages/RestablecerContrasena.test.tsx` y
  `VerificarCodigo.test.tsx`.
- `src/test/example.test.ts` (smoke).

> El resto de la aplicación (reserva, dashboard, membresía, admin) **no tiene
> cobertura automatizada** en el código actual.

## 8. Otras herramientas del ecosistema

| Herramienta | Rol |
|-------------|-----|
| pnpm | Gestor de paquetes (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). |
| ESLint 9 (flat config) | `js` + `typescript-eslint` + `react-hooks` + `react-refresh` (`eslint.config.js`); script `lint`. |
| Vercel | Despliegue con `vercel.json` (rewrite `/(.*)` → `/index.html`). |
| `lovable-tagger` | DevDependency del generador Lovable (metadatos de edición); no afecta el runtime. |
| Google Fonts | `Inter` y `Space Grotesk` importadas en `src/index.css`. |

## 9. Resumen de versiones (package.json)

| Dependencia | Versión declarada |
|-------------|-------------------|
| react / react-dom | ^19.2.4 |
| react-router-dom | ^7.13.1 |
| @tanstack/react-query | ^5.94.5 |
| react-hook-form | ^7.71.2 |
| zod | ^4.3.6 |
| @hookform/resolvers | ^5.2.2 |
| tailwindcss | ^3.4.19 |
| @mercadopago/sdk-react | ^1.0.7 |
| mapbox-gl | ^3.24.0 |
| qrcode.react | ^4.2.0 |
| recharts | ^3.8.0 |
| lucide-react | ^0.577.0 |
| sonner | ^2.0.7 |
| react-day-picker | ^9.14.0 |
| date-fns | ^4.1.0 |
| embla-carousel-react | ^8.6.0 |
| vaul | ^1.1.2 |
| cmdk | ^1.1.1 |
| input-otp | ^1.4.2 |
| react-resizable-panels | ^4.7.4 |
| typescript | ~5.9.3 |
| vite | ^8.0.2 |
| vitest | ^4.1.0 |
| @playwright/test | ^1.58.2 |

Referencias concretas del uso de cada una en `ESTRUCTURA.md` y `ARQUITECTURA.md`.