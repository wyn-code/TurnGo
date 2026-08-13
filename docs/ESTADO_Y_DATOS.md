# Estado y datos — TurnoGo Frontend

Análisis completo de **cómo se maneja el estado** en la aplicación: React state
local, Context API, TanStack React Query, persistencia y relaciones entre
mecanismos. Solo se documenta lo que existe en el código.

---

## 1. Visión general (mapa de capas de estado)

```mermaid
flowchart TB
    subgraph UI["Capa de UI (Componentes)"]
        LS[useState / useReducer\nEstado local efímero]
        RHF[React Hook Form\nEstado de formularios]
    end
    subgraph CONTEXT["React Context (Estado global de app)"]
        AC[AuthContext\nSesión + usuario + token]
        MC[MembershipContext\nPlan + funciones + gating]
        DBC[DashboardBusinessContext\nNegocio activo del dueño]
    end
    subgraph RQ["TanStack React Query (Caché de servidor)"]
        QU[Queries\nDatos de lectura]
        MU[Mutations\nEscrituras + invalidación]
        QC[QueryClient\nCaché global + config]
    end
    subgraph PERSIST["Persistencia entre recargas"]
        LS2[localStorage\nturnexo_token, turnexo_user,\nturnexo_pending_2fa_email]
        IDB[IndexedDB\n(no usado)]
    end
    subgraph HTTP["Transporte"]
        API[ApiClient (singleton)\nToken en memoria + fetch]
    end

    UI --> CONTEXT
    UI --> RQ
    UI --> RHF
    CONTEXT --> API
    CONTEXT --> PERSIST
    RQ --> API
    MU -.->|invalidate| QU
```

---

## 2. React State local (`useState` / `useReducer`)

**Alcance**: efímero, ligado al ciclo de vida del componente. No se comparte
salvo por *props drilling* o *Context*.

### Usos principales (ejemplos representativos)

| Componente / Archivo | Estado | Propósito |
|----------------------|--------|-----------|
| `Reservar.tsx` | `step`, `booking`, `occupiedAppointments`, `occupiedDays`, `visibleMonth`, `createdTurnoId`, `isLoading`, `error`, `submitError`, `isSubmitting`, `isLoadingSlots` | Flujo completo de reserva (4 pasos), disponibilidad calculada client-side, carga de negocio/servicios/profesionales. |
| `NegocioPerfil.tsx` | `business`, `services`, `professionals`, `isLoading`, `error` | Carga manual de datos del negocio público. |
| `Negocios.tsx` | `search`, `selectedCategory`, `selectedCity`, `businesses`, `categories`, `isLoading`, `error` | Marketplace: filtros client-side + carga inicial. |
| `DashboardResumen.tsx` | *ninguno* (todo vía React Query + Context) | — |
| `DashboardTurnos.tsx` | `view`, `cancelDialogOpen`, `cancelTurnoId`, `cancelMotivo`, `highlightedId` | UI de turnos: vista Hoy/Semana, diálogo cancelar, highlight por QR. |
| `RegistrarNegocio.tsx` | `step`, `submitted`, `isLoading` | Wizard 7 pasos (datos del form viven en RHF). |
| `Login.tsx` / `Registro.tsx` | `serverError`, `showPassword` | UI de formularios de auth (datos en RHF). |
| `VerifyEmailPage.tsx` | `loading`, `success`, `message` | Estado de verificación de email. |
| `components/ui/image-upload.tsx` | `uploading`, `preview` | Subida a Cloudinary. |
| `features/dashboard/components/stats/*` | Mínimo (p.ej. `activeTab` en `DashboardEstadisticas`) | UI de tabs, rangos. |

> **No se usa `useReducer`** en ningún componente del código analizado.

---

## 3. React Hook Form (estado de formularios)

Librería dedicada para formularios complejos con validación.

| Archivo | Esquema | Modo | Validación |
|---------|---------|------|------------|
| `Login.tsx` | `z.object({email, password})` | `onTouched` (default) | `zodResolver` |
| `Registro.tsx` | `z.object({usuario, email, password, nombre, apellido})` | `onChange` | `zodResolver` |
| `RestablecerContrasena.tsx` | `z.object({password, confirmPassword})` | `onBlur` | `zodResolver` |
| `VerificarCodigo.tsx` | `z.object({code: z.string().length(6)})` | `onChange` | `zodResolver` |
| `RegistrarNegocio.tsx` | `schema.tsx` (7 pasos, `fieldsPerStep`) | `onTouched` | `zodResolver` + `trigger(fieldsPerStep[step])` por paso |
| `DashboardServicios.tsx` (`ServiceForm`) | `serviceSchema` | `onChange` | `zodResolver` |
| `DashboardEmpleados.tsx` (`EmployeeForm`) | `employeeSchema` | `onChange` | `zodResolver` |

- Estado del formulario **aislado** en RHF (`register`, `handleSubmit`, `formState`).
- `RegistrarNegocio` valida **por paso** con `trigger()` antes de avanzar.
- `Login`/`Registro` usan `formState.isSubmitting` para loading del botón.

---

## 4. React Context (estado global de aplicación)

Tres contextos principales, proveídos en `src/App.tsx` (orden de envoltura):

### 4.1 `AuthContext` — `src/features/auth/contexts/AuthContext.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Proveedor** | `<AuthProvider>` envuelve toda la app (dentro de `MembershipProvider`). |
| **Estado interno** | `user: User \| null`, `token: string \| null`, `isLoading: boolean`, `pendingTwoFaEmail: string \| null`. |
| **Persistencia** | `localStorage`: `turnexo_token`, `turnexo_user`, `turnexo_pending_2fa_email`. |
| **Hidratación** | `useEffect` al montar: si hay `turnexo_token` → `apiClient.setToken` + `GET /auth/me` (`applySessionFromToken`). Si falla → limpia todo. |
| **API expuesta** | `login`, `loginWithToken`, `loginWithGoogle`, `register`, `verifyCredentials`, `verifyTwoFactorCode`, `requestPasswordReset`, `resetPassword`, `logout`, `setPendingTwoFaEmail`, `clearPendingTwoFaEmail`. |
| **Derivados** | `isAuthenticated = !!user && !!token`. |
| **Consumidores** | `ProtectedRoute`, `AdminRoute`, `Login`, `Registro`, `VerificarCodigo`, `Dashboard`, `DashboardSidebar`, `DashboardHeader`, `MembershipContext`, `RegistrarNegocio`, `SocialAuthButtons`, `VerifyEmailPage`, `AuthSuccess`, `AdminPanel`, `AdminBusinessesSection`. |

**Flujo de login**:
1. `Login` → `authService.login` → `POST /auth/login`.
2. Si `requires_2fa`: guarda `pendingTwoFaEmail` → `/verificar-codigo`.
3. Si `access_token`: `applySessionFromToken` → `localStorage` + `apiClient.setToken` + `GET /auth/me` → normaliza `User` → `setUser` + `setToken` + `localStorage.setItem('turnexo_user')`.
4. Navega a `redirectPath || "/dashboard"`.

**Logout**: limpia `user`, `token`, `localStorage` (3 claves), `apiClient.clearToken()`.

### 4.2 `MembershipContext` — `src/features/membership/contexts/MembershipContext.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Proveedor** | `<MembershipProvider>` (dentro de `AuthProvider`). |
| **Dependencia** | Consume `useAuth()` → `user.negocioId`. |
| **Datos** | `useFuncionesNegocio(negocioId)` (React Query) → `ApiNegocioFunciones`. |
| **Estado expuesto** | `planActual`, `estadoSuscripcion`, `fechaFin`, `funciones[]`, `isFree`, `loading`, `tieneFuncion(key)`, `refresh()`. |
| **Consumidores** | `PlanCard`, `FeatureGuard`, `UpgradeBanner`, `Planes`, `MiSuscripcion`, `DashboardHeader`, `DashboardSidebar`, `DashboardPersonalizacion`. |
| **Actualización** | `refresh()` → `queryClient.invalidateQueries(["funciones-negocio", negocioId])`. |

### 4.3 `DashboardBusinessContext` — `src/features/dashboard/contexts/DashboardBusinessContext.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Proveedor** | `<DashboardBusinessProvider>` creado por `Dashboard.tsx` tras `useMyBusiness(user.id)`. |
| **Valor** | `{ business: ApiNegocio \| null, isLoadingBusiness, refreshBusiness }`. |
| **Consumidores** | Todas las subpáginas del dashboard (`DashboardResumen`, `DashboardTurnos`, `DashboardServicios`, `DashboardEmpleados`, `DashboardHorarios`, `DashboardEstadisticas`, `DashboardConfiguracion`, `DashboardPersonalizacion`, `DashboardHeader`). |
| **Actualización** | `refreshBusiness()` → `refetch()` de `useMyBusiness`. |

> No hay `ThemeProvider` (`next-themes` instalado pero sin uso). No hay `AuthProvider` anidado dentro de `MembershipProvider`; el orden en `App.tsx` es: `AuthProvider` → `MembershipProvider` → `Suspense` → rutas.

---

## 5. TanStack React Query (caché de servidor)

**Cliente**: `QueryClient` creado en `src/App.tsx:33`, provisto por `QueryClientProvider`.

### 5.1 Queries (lecturas)

| Hook | Archivo | Key | Endpoint | Config clave |
|------|---------|-----|----------|--------------|
| `useServices` | `hooks/queries/useServicesQuery.ts` | `["services", businessId, includeInactive]` | `GET /servicios/?id_negocio=` | `staleTime: 5m`, `gcTime: 10m`, `enabled: businessId!=null` |
| `useEmployees` | `hooks/queries/useEmployeesQuery.ts` | `["employees", businessId]` | `GET /empleados/?id_negocio=` | `staleTime: 5m`, `gcTime: 10m` |
| `useHorarios` | `hooks/queries/useHorariosQuery.ts` | `["horarios", businessId]` | `GET /horarios/:id` | `staleTime: 5m`, `gcTime: 10m` |
| `useAppointments` | `hooks/queries/useAppointmentsQuery.ts` | `["appointments", businessId, desde, hasta]` | `GET /turnos/por-rango` | `staleTime: 1m`, `enabled: businessId && range` |
| `useStatistics` | `hooks/useEstadistica.ts` | `["statistics", businessId, rango, comparar]` | `GET /statistics/business/:id` (+ merge local) | `staleTime: 5m`, `placeholderData: keepPreviousData` |
| `usePlanes` | `features/membership/hooks/useMembershipQuery.ts` | `["planes"]` | `GET /planes/` | `staleTime: 10m`, `gcTime: 30m` |
| `useFuncionesNegocio` | ibid. | `["funciones-negocio", idNegocio]` | `GET /planes/negocios/:id/funciones` | `staleTime: 5m` |
| `useSuscripcionActual` | ibid. | `["suscripcion-actual"]` | `GET /pagos/suscripcion/actual` | `staleTime: 5m` |
| `useBusinesses` | `hooks/useApi.ts` | `["businesses", params]` | `GET /negocios/` | `staleTime: 5m` |
| `useMyBusiness` | ibid. | `["my-business", userId]` | `GET /negocios/me` | `staleTime: 2m` |
| `useBusinessBySlug` | ibid. | `["business", slug]` | `GET /negocios/slug/:slug` | `staleTime: 10m` |
| `useCategories` | ibid. | `["categories"]` | `GET /categorias/` | `staleTime: 1h` |

**Patrones comunes**:
- `enabled: businessId != null` para evitar fetches sin ID.
- `staleTime` 5 min (lecturas de catálogo/recursos) a 10 min (categorías).
- `gcTime` (antes `cacheTime`) 10-30 min.
- `keepPreviousData` solo en `useStatistics` para transiciones suaves al cambiar rango.

### 5.2 Mutations (escrituras)

| Hook | Archivo | Endpoint | Invalidación típica |
|------|---------|----------|---------------------|
| `useCreateService` | `hooks/mutations/useCreateService.ts` | `POST /servicios/` | `["services"]` |
| `useUpdateService` | `hooks/mutations/useUpdateService.ts` | `PUT /servicios/:id` | `["services"]` |
| `useToggleService` | `hooks/mutations/useToggleService.ts` | `PATCH /servicios/:id` | `["services"]` |
| `useCreateEmployee` | `hooks/mutations/useCreateEmployee.ts` | `POST /empleados/` | `["employees"]` |
| `useUpdateEmployee` | `hooks/mutations/useUpdateEmployee.ts` | `PUT /empleados/:id` | `["employees"]` |
| `useToggleEmployee` | `hooks/mutations/useToggleEmployee.ts` | `PATCH /empleados/:id` | `["employees"]` |
| `useUpdateHorarios` | `hooks/mutations/useUpdateHorarios.ts` | `POST`/`PUT /horarios/:id` | `["horarios"]` |
| `useUpdateBusiness` | `hooks/mutations/useBusinessService.ts` | `PUT /negocios/:id` | `["businesses"]`, `["my-business"]`, `["business", slug]` + `setQueryData` optimista |
| `useCrearPreferencia` | `features/membership/hooks/useMembershipMutations.ts` | `POST /pagos/crear-preferencia` | — (redirect externo) |
| `useCancelarSuscripcion` | ibid. | `POST /pagos/suscripcion/:id/cancelar` | `["suscripcion-actual"]`, `["funciones-negocio"]` |
| `useToggleRenovacion` | ibid. | `PUT /pagos/suscripcion/:id/renovacion-automatica` | `["suscripcion-actual"]` |

**Mutations inline** (sin hook dedicado):
- `DashboardTurnos.tsx`: `statusMutation` → `PUT /turnos/:id/estado` → `invalidateQueries(["appointments"])`.
- `AdminBusinessesSection.tsx` / `AdminUsersSection.tsx`: llamadas directas a `businessService`/`userService` + `setState` local (no usan React Query).

### 5.3 Configuración global

```ts
// src/App.tsx
const queryClient = new QueryClient(); // defaults
```

No se configuran `defaultOptions` globales; cada query/mutation define su
`staleTime`, `gcTime`, `retry`, etc.

---

## 6. Persistencia

| Mecanismo | Qué guarda | Dónde | Lectura |
|-----------|------------|-------|---------|
| `localStorage` | `turnexo_token` (JWT) | Navegador | `AuthContext` al montar |
| `localStorage` | `turnexo_user` (objeto `User` serializado) | Navegador | `AuthContext` al montar |
| `localStorage` | `turnexo_pending_2fa_email` | Navegador | `AuthContext` (estado `pendingTwoFaEmail`) |
| React Query | Caché de queries/mutations | Memoria (JS) | `QueryClient` (se pierde al recargar) |
| `IndexedDB` | — | — | No usado |
| Cookies | — | — | No usado (token solo en memoria + localStorage) |

> El token **no** se envía en cookie; va en header `Authorization: Bearer` inyectado
> por `ApiClient` desde su propiedad interna `token` (memoria).

---

## 7. Relación entre mecanismos

```mermaid
flowchart LR
    subgraph INICIO["Arranque de la app"]
        A1[main.tsx → App.tsx]
        A2[AuthProvider monta]
        A3[useEffect hidratación\nlocalStorage → apiClient.setToken → GET /auth/me]
        A4[MembershipProvider monta\nusa useAuth → negocioId → useFuncionesNegocio]
        A5[Dashboard monta → useMyBusiness → DashboardBusinessProvider]
    end

    subgraph FLUJO["Flujo de dato típico (ej. dashboard)"]
        B1[Componente DashboardTurnos]
        B2[useAppointments(businessId, range)]
        B3[React Query: cache hit? → data / loading]
        B4[Miss → appointmentService.getAppointmentsByRange]
        B5[ApiClient.request(GET /turnos/por-rango, Authorization)]
        B6[Backend → JSON]
        B7[React Query cache ← data]
        B8[Componente ← {data, isLoading, error}]
        B9[UI render]
    end

    subgraph MUTACION["Mutación (ej. cambiar estado turno)"]
        C1[Usuario click "Confirmar"]
        C2[statusMutation.mutate({id, estado})]
        C3[appointmentService.changeStatus → PUT /turnos/:id/estado]
        C4[ApiClient.request]
        C5[Backend OK]
        C6[onSuccess → invalidateQueries(["appointments"])]
        C7[React Query refetch automático]
        C8[UI actualizada]
    end

    subgraph SESION["Ciclo de sesión"]
        D1[Login → access_token]
        D2[AuthContext.applySessionFromToken]
        D3[localStorage.setItem(token, user)]
        D4[apiClient.setToken(token)]
        D6[MembershipContext.refresh → invalidate funcions-negocio]
        D7[Logout → clear localStorage + apiClient.clearToken()]
    end
```

**Puntos clave de acoplamiento**:

1. **AuthContext → ApiClient**: `apiClient.setToken(token)` al logar / hidratar; `clearToken()` al logout / 401.
2. **AuthContext → MembershipContext**: `user.negocioId` determina qué `funciones-negocio` consultar.
3. **AuthContext → Dashboard**: `user.id` → `useMyBusiness` → `DashboardBusinessContext`.
4. **React Query → ApiClient**: todos los services llaman a `apiClient.*`; el token viene de memoria del singleton.
3. **Mutations → React Query invalidation**: tras éxito, `invalidateQueries` dispara refetch de queries relacionadas.
4. **Context refresh methods** → `queryClient.invalidateQueries` (p.ej. `MembershipContext.refresh()`, `DashboardBusinessContext.refreshBusiness()`).

---

## 8. Qué NO existe (para evitar suposiciones)

| Mecanismo | Estado |
|-----------|--------|
| Redux / Zustand / Jotai / Valtio / Signals | **No instalado ni usado**. |
| `useReducer` en componentes | **No hallado** en el código. |
| `next-themes` / `ThemeProvider` | Instalado pero **sin uso**; modo oscuro solo existe como CSS en `index.css`. |
| Persistencia de React Query a disco (persistQueryClient) | **No configurado**. |
| Cookies / HttpOnly para JWT | Token solo en `localStorage` + memoria. |
| WebSockets / Server-Sent Events / polling automático | Solo `refetch` por invalidación o `staleTime`. |
| `React Query` `mutationKey` global | No se usan `mutationKey` con nombre; solo keys de query. |
| `React Query` `queryKey` factories centralizadas | Keys definidas inline en cada hook (`["services", businessId, ...]`). |

---

## 9. Resumen de responsabilidades por capa

| Capa | Qué gestiona | Ejemplo |
|------|--------------|---------|
| **Componente (`useState`)** | UI efímera: paso actual, modales abiertos, loading local, selección visual. | `step` en `Reservar`, `cancelDialogOpen` en `DashboardTurnos`. |
| **React Hook Form** | Estado de formulario + validación + envío. | `RegistrarNegocio` (7 pasos), `Login`, `ServiceForm`. |
| **Context (Auth/Membership/DashboardBusiness)** | Estado global de sesión, plan/permisos, negocio activo. Compartido por árboles enteros. | `user`, `token`, `tieneFuncion`, `business`. |
| **React Query (Queries)** | Caché de lecturas del servidor, dedup, stale/refresh, loading/error estandarizados. | `useServices`, `useAppointments`, `useStatistics`. |
| **React Query (Mutations)** | Escrituras + invalidación automática de caché relacionada. | `useCreateService`, `statusMutation`, `useCancelarSuscripcion`. |
| **ApiClient** | Transporte HTTP único, headers, errores, 401→redirect, token en memoria. | Todas las llamadas a backend. |
| **localStorage** | Persistencia de sesión entre recargas (token, user, pending 2FA). | Hidratación al montar `AuthProvider`. |

---

## 10. Archivos clave de estado

| Archivo | Qué define |
|---------|------------|
| `src/features/auth/contexts/AuthContext.tsx` | AuthContext completo. |
| `src/features/membership/contexts/MembershipContext.tsx` | MembershipContext. |
| `src/features/dashboard/contexts/DashboardBusinessContext.tsx` | DashboardBusinessContext. |
| `src/hooks/queries/*.ts` | Queries reutilizables. |
| `src/hooks/mutations/*.ts` | Mutations reutilizables. |
| `src/hooks/useApi.ts` | Queries/mutations de negocio genéricas. |
| `src/hooks/useEstadistica.ts` | Query de estadísticas. |
| `src/features/membership/hooks/useMembershipQuery.ts` | Queries de planes/funciones/suscripción. |
| `src/features/membership/hooks/useMembershipMutations.ts` | Mutations de membresía. |
| `src/lib/api-client.ts` | ApiClient + ApiError. |
| `src/lib/api-config.ts` | Bases de URL. |
| `src/lib/api-error.ts` | Normalización de errores. |