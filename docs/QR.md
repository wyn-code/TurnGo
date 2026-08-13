# Códigos QR — TurnoGo Frontend

Análisis completo del funcionamiento de los **códigos QR** en el frontend.
Solo se documenta lo que existe en el código.

---

## 1. Resumen ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **Generación** | Sí — `QRCodeSVG` de `qrcode.react` en `BookingSummary.tsx` |
| **Lectura / Escaneo** | **No** — no hay cámara, escáner ni `@zxing/library` / `html5-qrcode` |
| **Payload** | Deep-link: `{origin}/dashboard/turnos?turno={id_turno}` |
| **Validación frontend** | Ninguna (solo UI de presentación) |
| **Validación backend** | No observable desde frontend (se asume que `/dashboard/turnos` consulta el turno por ID) |

> **Conclusión**: el QR es un **enlace de navegación** (deep-link) que el cliente presenta al negocio; el negocio lo "lee" abriendo la URL en el navegador del dashboard. No hay proceso criptográfico de verificación ni firma en el frontend.

---

## 2. Generación del QR

### 2.1 Componente responsable

`src/features/booking/components/BookingSummary.tsx:141-146`

```tsx
<QRCodeSVG
  value={`${window.location.origin}/dashboard/turnos?turno=${turnoId}`}
  size={160}
  level="M"
  includeMargin={false}
/>
```

### 2.2 Props del `QRCodeSVG`

| Prop | Valor | Significado |
|------|-------|-------------|
| `value` | `${window.location.origin}/dashboard/turnos?turno=${turnoId}` | URL completa del dashboard con query param `turno` |
| `size` | `160` | 160×160 px |
| `level` | `"M"` | Corrección de errores Media (15%) |
| `includeMargin` | `false` | Sin margen blanco alrededor |

### 2.3 Cuándo se renderiza

En `BookingSummary.tsx:138-153`:

```tsx
{confirmed && turnoId && (
  <div className="flex flex-col items-center gap-2 py-4">
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-border">
      <QRCodeSVG ... />
    </div>
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <QrCode size={12} /> Presentá este código al llegar
    </p>
  </div>
)}
```

**Condiciones**: `confirmed === true` **Y** `turnoId` definido (numérico).

### 2.4 Datos que llegan al componente

`BookingSummary` recibe como props (`BookingSummary.tsx:18-27`):

```typescript
interface BookingSummaryProps {
  service: ApiServicio;
  professional: ApiEmpleado;
  date: Date;
  time: string;
  client: { firstName: string; lastName: string; email: string; phone: string };
  businessName: string;
  confirmed?: boolean;        // true solo en pantalla final (paso 4)
  turnoId?: number | null;    // id_turno devuelto por POST /turnos/
}
```

- `confirmed` y `turnoId` vienen del padre `Reservar.tsx` tras crear el turno exitosamente.

---

## 3. Flujo de generación en la reserva

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant R as Reservar.tsx
    participant A as appointmentService
    participant API as API Backend
    participant BS as BookingSummary
    participant QR as QRCodeSVG

    U->>R: Completa pasos 1-3 (servicio, pro, fecha, hora, datos)
    R->>A: createAppointment({id_negocio, id_cliente, id_servicio, id_empleado, fecha_hora_inicio})
    A->>API: POST /turnos/
    API-->>A: ApiTurno { id_turno, ... }
    A-->>R: res.id_turno
    R->>R: setCreatedTurnoId(id_turno); setStep(4)
    R->>BS: <BookingSummary confirmed={true} turnoId={id_turno} ... />
    BS->>QR: QRCodeSVG value={`${origin}/dashboard/turnos?turno=${turnoId}`}
    QR-->>U: SVG del QR renderizado en pantalla
```

---

## 4. Uso del QR por el negocio (lectura)

### 4.1 Deep-link en el dashboard

El QR codifica: `https://{dominio}/dashboard/turnos?turno=123`

### 4.2 Manejo en `DashboardTurnos.tsx`

1. **Lectura del query param** (`DashboardTurnos.tsx:106-108`):
   ```typescript
   const [searchParams, setSearchParams] = useSearchParams();
   const highlightedId = searchParams.get("turno");
   ```

2. **Scroll automático al turno** (`DashboardTurnos.tsx:160-167`):
   ```typescript
   useEffect(() => {
     if (highlightedId && sortedAppointments.length > 0) {
       const timer = setTimeout(() => {
         highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
       }, 300);
       return () => clearTimeout(timer);
     }
   }, [highlightedId, sortedAppointments.length]);
   ```

3. **Limpieza automática** (`DashboardTurnos.tsx:169-177`):
   ```typescript
   useEffect(() => {
     if (highlightedId) {
       const timer = setTimeout(() => {
         searchParams.delete("turno");
         setSearchParams(searchParams, { replace: true });
       }, 5000);
       return () => clearTimeout(timer);
     }
   }, [highlightedId]);
   ```

3. **Resaltado visual** (`DashboardTurnos.tsx:260-265`):
   ```tsx
   <div
     key={appointment.id_turno}
     ref={String(appointment.id_turno) === highlightedId ? highlightedRef : undefined}
     className={`... ${
       String(appointment.id_turno) === highlightedId
         ? "border-primary bg-primary/5 ring-2 ring-primary/20"
         : "border-border"
     }`}
   >
   ```

### 4.3 Qué **NO** hace el frontend

- No valida firma/autenticidad del QR
- No consulta `/turnos/{id}` al escanear (el turno ya está en la lista cargada por `useAppointments`)
- No hay cámara / `navigator.mediaDevices` / `BarcodeDetector` / `@zxing/library`
- No hay endpoint "validar QR" consumido por frontend

---

## 5. Componentes involucrados

| Archivo | Rol |
|---------|-----|
| `src/features/booking/components/BookingSummary.tsx` | Genera y renderiza el QR (`QRCodeSVG`) + botón Google Calendar |
| `src/features/booking/pages/reserva/Reservar.tsx` | Orquesta la reserva, obtiene `turnoId` y pasa `confirmed=true` + `turnoId` a `BookingSummary` |
| `src/features/dashboard/pages/subpages/DashboardTurnos.tsx` | Consume `?turno=` → resalta turno en lista + auto-limpia param |
| `src/features/booking/services/appointment.service.ts` | `createAppointment` → `POST /turnos/` devuelve `id_turno` |

---

## 6. Dependencias

| Paquete | Uso |
|---------|-----|
| `qrcode.react` (^4.2.0) | Componente `QRCodeSVG` (único import en `BookingSummary.tsx:15`) |

---

## 7. Reglas de negocio observables desde frontend

| Regla | Evidencia en código |
|-------|---------------------|
| El QR solo se muestra **tras confirmación exitosa** | `confirmed && turnoId` en `BookingSummary.tsx:138` |
| El QR contiene **solo el ID del turno** como query param | `value={`${origin}/dashboard/turnos?turno=${turnoId}`}` |
| El negocio **no necesita autenticación extra** para ver el turno destacado | `DashboardTurnos` usa `useAppointments` (ya autenticado por `ProtectedRoute`) |
| El parámetro `turno` **se auto-limpia a los 5 segundos** | `setTimeout(() => searchParams.delete("turno"), 5000)` |
| No hay expiración del QR en frontend | El link es permanente mientras exista el turno |

---

## 8. Qué NO existe (para evitar suposiciones)

| Funcionalidad | Estado |
|---------------|--------|
| Escáner de cámara en frontend | **No** (ningún uso de `navigator.mediaDevices`, `BarcodeDetector`, `html5-qrcode`, `@zxing/library`) |
| Validación de firma/token en QR | **No** (payload es URL plana) |
| Endpoint `/qr/validate` o similar | **No consumido** por frontend |
| QR con datos firmados (JWT, payload cifrado) | **No** (solo deep-link) |
| QR en versión imprimible / PDF | **No** (solo SVG en pantalla) |
| Historial de escaneos | **No** |
| Notificación push al negocio al escanear | **No** (solo highlight visual) |

---

## 9. Archivos clave

| Archivo | Qué hace |
|---------|----------|
| `src/features/booking/components/BookingSummary.tsx:138-153` | Renderiza `QRCodeSVG` con deep-link + texto "Presentá este código al llegar" |
| `src/features/booking/pages/reserva/Reservar.tsx:320, 386-396` | Obtiene `turnoId` de respuesta y pasa `confirmed=true` + `turnoId` a `BookingSummary` |
| `src/features/dashboard/pages/subpages/DashboardTurnos.tsx:106-177` | Lee `?turno=`, resalta, scroll, auto-limpia a 5s |
| `src/features/booking/services/appointment.service.ts:18-20` | `createAppointment` → devuelve `ApiTurno` con `id_turno` |