# Componentes principales — TurnoGo Frontend

Este documento describe los **componentes arquitectónicamente relevantes** del
frontend, sus responsabilidades, props, datos, eventos y relaciones. Se omiten
componentes triviales (botones, inputs, wrappers de UI genéricos) para
centrarse en las piezas que definen la arquitectura y la reutilización
entre funcionalidades.

> **Convención**: rutas relativas a `src/`. `Api*` = tipos de `types/api.ts`.

---

## 1. Componentes de layout y navegación global

### 1.1 `components/NavLink.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Wrapper tipado de `react-router-dom.NavLink` que expone `activeClassName` y `pendingClassName` mediante `className` callback. |
| **Props** | `className?`, `activeClassName?`, `pendingClassName?`, resto de props nativas del `NavLink` de RR. |
| **Eventos** | Ninguno propio; delega al componente nativo. |
| **Reutilización** | Usado por `DashboardSidebar`, `AdminNavbar` y cualquier navegación que necesite estilo activo/pendiente. |

### 1.2 `features/landing/components/Navbar.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Barra de navegación pública (home, explorar, login/registro, CTA de dueños). |
| **Props** | Ninguna (componente de página). |
| **Datos** | Lee `useAuth()` para mostrar avatar/menú de usuario si hay sesión; en caso contrario muestra botones de login/registro. |
| **Eventos** | `onClick` en enlaces → navegación; logout llama `useAuth().logout()`. |
| **Reutilización** | Renderizado en todas las páginas públicas (`Index`, `Negocios`, `NegocioPerfil`, `Login`, `Registro`, `Reservar`, `RegistrarNegocio`, `Planes`, `MiSuscripcion`, `ResultadoPago`, `AuthSuccess`). |

### 1.3 `features/landing/components/Footer.tsx`

Componente estático de pie de página (enlaces legales, redes sociales, copyright). Sin props ni estado. Reutilizado en todas las páginas públicas.

### 1.3 `features/dashboard/components/DashboardSidebar.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Menú lateral colapsable del panel del dueño. Ítems fijos + sección "Membresía" condicional. |
| **Props** | Ninguna. |
| **Datos** | `useLocation()` para activo; `useMembership()` → `planActual`, `loading` (muestra badge en "Mi Suscripción"); `useSidebar()` (Radix) para estado colapsado. |
| **Eventos** | Navegación vía `NavLink` (wrappers `asChild` de `SidebarMenuButton`). |
| **Reutilización** | Exclusivo del layout `/dashboard/*` (montado por `Dashboard.tsx`). |

### 1.4 `features/dashboard/components/DashboardHeader.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Cabecera fija del dashboard: título de sección, badge de plan, botón "Ver página" (enlace a `/negocio/:slug`), logout. |
| **Props** | `title: string` (recibido de `DashboardContent` según sub-ruta). |
| **Datos** | `useAuth().logout` + `useNavigate`; `useDashboardBusiness().business` para el slug; `useMembership().planActual`. |
| **Eventos** | `handleLogout` → `logout()` + `navigate("/login")`. |
| **Reutilización** | Una instancia por layout de dashboard (`Dashboard.tsx`). |

### 1.5 `features/admin/components/AdminNavbar.tsx`

Menú de tabs interno del panel admin (`Negocios`, `Usuarios`). Usa `NavLink` con `end` y `activeClassName`. Sin props. Renderizado por `AdminPanel`.

---

## 2. Componentes de marketplace y detalle de negocio

### 2.1 `features/marketplace/components/BusinessCard.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Tarjeta de negocio en listado: imagen, categoría, nombre, ciudad, dirección, botón "Reservar". |
| **Props** | `business: ApiNegocio`, `categories: ApiCategory[]` (para resolver nombre de categoría). |
| **Datos** | Resuelve imagen de portada vía `getCategoryImage(categoria)` (`lib/placeholders.ts`). |
| **Eventos** | `Link to="/negocio/${slug}"` → navegación; botón "Reservar" es visual (el click en la card ya navega). |
| **Reutilización** | Renderizado por `BusinessesGrid` dentro de `Negocios.tsx`. |

### 2.2 `features/marketplace/components/BusinessesGrid.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Grid responsivo (1/2/3 cols) de `BusinessCard`; estado vacío con mensaje. |
| **Props** | `businesses: ApiNegocio[]`, `categories: ApiCategory[]`. |
| **Reutilización** | Usado por `Negocios.tsx` (marketplace público). |

### 2.3 `features/business/components/ServiceCard.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Tarjeta de servicio con nombre, duración, precio, selección visual y botón opcional "Reservar". |
| **Props** | `service: ApiServicio`, `selected?: boolean`, `onSelect?(service)`, `showBookButton?: boolean` (default `true`), `onBook?(service)`. |
| **Eventos** | `onClick` en la card → `onSelect`; botón "Reservar" → `onBook` con `stopPropagation`. |
| **Reutilización** | `NegocioPerfil.tsx` (con botón), `Reservar.tsx` (solo selección, `showBookButton=false`). |

### 2.4 `features/business/components/ProfessionalCard.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Tarjeta de profesional: avatar (iniciales), nombre completo, teléfono opcional, selección visual. |
| **Props** | `professional: ApiEmpleado`, `selected?: boolean`, `onSelect?(professional)`. |
| **Eventos** | Click en card → `onSelect`. |
| **Reutilización** | `NegocioPerfil.tsx`, `Reservar.tsx`. |

### 2.5 `features/business/components/HorarioCard.tsx`

Tarjeta de visualización de un día de horario (día, apertura, cierre, segunda franja opcional). Usada en `NegocioPerfil` y `DashboardHorarios` (como solo lectura).

### 2.6 `features/business/components/Map.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Mapa Mapbox GL con marker y popup del negocio. |
| **Props** | `latitud: number`, `longitud: number`, `nombre: string`. |
| **Efectos** | `useEffect` monta `mapboxgl.Map`, limpieza con `map.remove()`. |
| **Reutilización** | `NegocioPerfil.tsx` (ver perfil público). |

### 2.7 `features/business/components/ScheduleEditor.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Editor visual de horarios semanales: por día, hasta dos franjas (apertura/cierre), toggle "abierto". Genera `WeekSchedule` (tipo de `types/api.ts`). |
| **Props** | `value: WeekSchedule`, `onChange: (v: WeekSchedule) => void`, `disabled?`. |
| **Eventos** | `onChange` emite el objeto completo tras cada interacción. |
| **Reutilización** | `RegistrarNegocio` (paso 7), `DashboardHorarios` (edición). |

---

## 3. Componentes del flujo de reserva

### 3.1 `features/booking/components/BookingStepper.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Indicador visual de pasos (íconos numerados + labels), marca completados/actual/pendientes. |
| **Props** | `currentStep: number`, `steps: string[]`. |
| **Reutilización** | `Reservar.tsx` (4 pasos), `RegistrarNegocio.tsx` (7 pasos). |

### 3.2 `features/booking/components/BookingForm.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Formulario de datos del cliente (nombre, apellido, teléfono, email, notas) controlado por RHF externo. |
| **Props** | `data: {firstName,lastName,phone,email,notes}`, `onChange: (data) => void`. |
| **Reutilización** | Paso 3 de `Reservar.tsx`. |

### 3.3 `features/booking/components/BookingSummary.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Resumen lateral (o pantalla final) con detalle del turno, QR, botón "Añadir a Google Calendar", enlaces de navegación. |
| **Props** | `service: ApiServicio`, `professional: ApiEmpleado`, `date: Date`, `time: string`, `client`, `businessName`, `confirmed?: boolean`, `turnoId?: number`. |
| **Efectos** | Si `confirmed && turnoId` renderiza `QRCodeSVG` con deep-link `/dashboard/turnos?turno={id}`. |
| **Eventos** | Botón "Añadir a Google Calendar" → abre URL generada (`generateGoogleCalendarLink`). |
| **Reutilización** | Paso 3 (lateral) y paso 4 (pantalla completa) de `Reservar.tsx`. |

### 3.4 `features/auth/components/SocialAuthButtons.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Botón "Continuar con Google" usando `google.accounts.id` (render manual con retry). |
| **Props** | `onNeedsVerification?()`. |
| **Datos** | `useAuth().loginWithGoogle(credential)`; `VITE_GOOGLE_CLIENT_ID` leído de `import.meta.env`. |
| **Eventos** | Callback de Google → `handleGoogleCredential` → `loginWithGoogle` → navega o muestra error. |
| **Nota** | El SDK de Google **no se carga** en el HTML actual (ver ARQUITECTURA.md §10). |

---

## 4. Componentes de onboarding (registro de negocio)

### 4.1 Paso a paso (`features/register-business/components/*Step.tsx`)

| Componente | Props clave | Responsabilidad |
|------------|-------------|-----------------|
| `BusinessInfoStep` | `form: UseFormReturn<FormData>` | Nombre, categoría, descripción. |
| `BusinessImageStep` | `form` | Subida de logo e imágenes (`ImageUpload`). |
| `BusinessContactStep` | `form` | WhatsApp, teléfono, Instagram, Facebook. |
| `BusinessLocationStep` | `form` | Dirección, ciudad, provincia, localidad. |
| `BusinessServicesStep` | `form` | Lista dinámica de servicios (añadir/eliminar, nombre, precio, duración). |
| `BusinessEmployeesStep` | `form` | Lista de empleados (nombre, apellido). |
| `BusinessScheduleStep` | `form` | `ScheduleEditor` para horarios semanales. |
| `SuccessView` | `data: FormData`, `navigate` | Pantalla final con resumen y botón "Ir al dashboard". |

> El formulario global vive en `RegistrarNegocio.tsx` (RHF + Zod), valida por paso con `trigger(fieldsPerStep[step])` y emite el payload mapeado a `CreateCompleteBusinessRequest` (`mapper.ts`).

### 4.2 `components/ui/image-upload.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Subida directa a Cloudinary (unsigned preset) con preview, validación (image/*, ≤5MB) y limpieza. |
| **Props** | `value?`, `onChange(url)`, `cloudName`, `uploadPreset`, `showPreview?`, `disabled?`. |
| **Eventos** | `onChange(secure_url)` tras subida exitosa; `handleClear` → `onChange("")`. |
| **Reutilización** | `BusinessImageStep` (logo + imágenes), `DashboardPersonalizacion` (logo, portada). |

---

## 5. Componentes de dashboard (gestión del dueño)

### 5.1 `features/dashboard/components/stats/*` (analítica)

| Componente | Responsabilidad |
|------------|-----------------|
| `StatsHeader` | Título + nombre del negocio. |
| `StatsRangeToggle` | Selector de rango (hoy/semana/mes/año). |
| `StatsExportButton` | `onExport({excel,csv})` → `exportStatisticsFile`. |
| `StatsKpiCards` | 4 tarjetas KPI con navegación a tabs. |
| `StatsInsights` | Tarjetas de insights derivados. |
| `StatsCharts` | Wrapper de `recharts` (barras, líneas, donas) usado por tabs. |
| `StatsSkeleton` / `StatsEmptyState` | Loading y estados vacíos. |
| `ResumenTab`…`EmpleadosTab` | Cada tab renderiza su sección (tablas, gráficos, listas). |

### 5.2 `features/dashboard/pages/subpages/services/ServiceForm.tsx` y `EmployeeForm.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Modales de creación/edición (RHF + Zod) para servicios y empleados. |
| **Props** | `initialData?` (para edición), `onSubmit`, `onClose`. |
| **Eventos** | `onSubmit` llama mutation correspondiente (`useCreateService`/`useUpdateService` o `useCreateEmployee`/`useUpdateEmployee`). |

### 5.3 `features/dashboard/pages/subpages/services/DeactivateServiceDialog.tsx`

Diálogo de confirmación para desactivar servicio (soft-delete). Llama `useToggleService`.

---

## 6. Componentes de membresía y pagos

### 6.1 `features/membership/components/PlanCard.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Tarjeta de plan: nombre, descripción, precio, lista de features (✓/✗), botón "Suscribirse" o "Plan actual". |
| **Props** | `plan: ApiPlan`, `isCurrentPlan?`, `onSubscribe?(idPlan)`, `subscribing?`. |
| **Datos** | `FEATURE_LABELS` mapea claves de feature (`mapa_ubicacion`, `imagenes_personalizadas`, `soporte_prioritario`) a texto. Planes gratis usan `FREE_FEATURES` hardcodeado. |
| **Eventos** | `onSubscribe(idPlan)` → `Planes.tsx` llama `useCrearPreferencia`. |

### 6.2 `features/membership/components/FeatureGuard.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Render prop que muestra `children` solo si `tieneFuncion(featureKey)`; si no, muestra fallback o UI de upgrade. |
| **Props** | `featureKey: string`, `children`, `fallback?`. |
| **Datos** | `useMembership().tieneFuncion`. |
| **Reutilización** | `DashboardPersonalizacion` (gating de `mapa_ubicacion`, `imagenes_personalizadas`). |

### 6.3 `features/membership/components/UpgradeBanner.tsx`

Banner informativo que invita a ver planes cuando el usuario intenta acceder a una feature bloqueada.

---

## 7. Componentes de administración

### 7.1 `features/admin/components/AdminBusinessesSection.tsx`

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Tabla de negocios con búsqueda, edición modal (`EditBusinessModal`), eliminación (`DeleteBusinessDialog`). |
| **Datos** | `businessService.getAllAdmin()` → `ApiNegocio[]`. |
| **Mutations** | `businessService.update`, `businessService.delete`. |
| **UI** | `EditBusinessModal` (form inline), `DeleteBusinessDialog` (confirm). |

### 7.2 `features/admin/components/AdminUsersSection.tsx`

Misma estructura para usuarios: `userService.getAllAdmin()`, `update`, `toggleStatus`, `delete` con modales `EditUserModal`/`DeleteUserDialog`.

---

## 8. Componentes de UI compartidos (genéricos)

No se documentan uno a uno (son ~51 en `components/ui/`); patrones comunes:

| Patrón | Ejemplos |
|--------|----------|
| **Formularios** | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` (RHF + Zod). |
| **Datos** | `Table`/`TableHeader`/`TableRow`/`TableCell`; `Card`/`CardHeader`/`CardContent`/`CardFooter`. |
| **Feedback** | `Toast`/`Toaster`/`use-toast` (Radix), `Sonner` (toasts globales), `Alert`, `AlertDialog`. |
| **Navegación** | `Sidebar` (Radix + `DashboardSidebar`), `DropdownMenu`, `Tabs`, `Breadcrumb`, `Pagination`. |
| **Inputs** | `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `InputOtp`, `DatePicker` (`Calendar` + `react-day-picker`). |
| **Overlay** | `Dialog`, `Sheet`, `Drawer` (`vaul`), `Popover`, `HoverCard`, `Tooltip`. |
| **Data viz** | `Chart` (wrapper `recharts` — `ChartContainer`, `ChartTooltip`, `ChartLegend`, etc.). |
| **Otros** | `Avatar`, `Badge`, `Separator`, `Skeleton`, `ScrollArea`, `ResizablePanel`, `Carousel`, `Command` (`cmdk`). |

Todos usan `cn()` (`lib/utils.ts`) para composición de clases y aceptan `className` para extensión.

---

## 9. Resumen de reutilización por funcionalidad

| Funcionalidad | Componentes clave reutilizados |
|---------------|--------------------------------|
| **Marketplace** | `BusinessCard` + `BusinessesGrid` + `CategoryFilter` + `SearchBar` + `Navbar`/`Footer`. |
| **Detalle negocio** | `ServiceCard`, `ProfessionalCard`, `HorarioCard`, `Map`, `Navbar`/`Footer`. |
| **Reserva** | `BookingStepper`, `ServiceCard`, `ProfessionalCard`, `Calendar`, `BookingForm`, `BookingSummary`, `Navbar`/`Footer`. |
| **Registro negocio** | Pasos (7) + `ScheduleEditor` + `ImageUpload` + `BookingStepper` + `Navbar`/`Footer`. |
| **Dashboard dueño** | `DashboardSidebar`, `DashboardHeader`, KPIs/Tabs/Charts, `ServiceForm`, `EmployeeForm`, `ScheduleEditor`, `ImageUpload`, `FeatureGuard`. |
| **Membresía** | `PlanCard`, `FeatureGuard`, `UpgradeBanner`, `Navbar`/`Footer`. |
| **Admin** | `AdminNavbar`, `AdminBusinessesSection`/`AdminUsersSection` + modales, `Navbar` (no landing). |
| **Auth** | `SocialAuthButtons`, `Navbar`/`Footer`, formularios RHF+Zod. |
| **Landing** | Secciones (`Hero`, `Benefits*`, `Categories`, `HowItWorks`, `RecommendedBusinesses`, `VIPPlan`, `BusinessCTA`, `Footer`). |

---

## 10. Componentes "puente" entre funcionalidades

| Componente | Usado en |
|------------|----------|
| `BookingStepper` | `Reservar`, `RegistrarNegocio` |
| `ServiceCard` | `NegocioPerfil` (con botón), `Reservar` (solo selección) |
| `ProfessionalCard` | `NegocioPerfil`, `Reservar` |
| `ScheduleEditor` | `RegistrarNegocio` (paso 7), `DashboardHorarios` |
| `ImageUpload` | `BusinessImageStep`, `DashboardPersonalizacion` |
| `FeatureGuard` | `DashboardPersonalizacion` |
| `Navbar`/`Footer` | **Todas** las páginas públicas + auth + onboarding + membresía |
| `NavLink` | `DashboardSidebar`, `AdminNavbar` |
| `BookingSummary` | Paso 3 (lateral) y paso 4 (completa) de `Reservar` |