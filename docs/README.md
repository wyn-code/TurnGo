# Documentación técnica — TurnoGo Frontend

Índice raíz de la documentación técnica del frontend de **TurnoGo**, la aplicación
web de reserva de turnos para negocios de servicios (peluquerías, barberías,
estética, etc.). El código vive en este mismo monorepositorio, en la raíz del
proyecto (SPA en `src/`).

Esta documentación está pensada como material de referencia para una tesis
universitaria. Describe únicamente lo que el código real implementa: no
documenta funcionalidades hipotéticas ni arquitectura deseada.

> **Advertencia**: este repositorio no contiene un `README.md` propio en la raíz.
> Este documento cumple esa función como índice de la documentación generada.

---

## Índice de documentos

| Documento | Contenido |
|-----------|-----------|
| [ARQUITECTURA.md](./ARQUITECTURA.md) | Arquitectura general, capas, flujo de datos, comunicación con el backend, React Query, routing, estado e integraciones externas. |
| [ESTRUCTURA.md](./ESTRUCTURA.md) | Estructura de carpetas, responsabilidad de cada directorio y relación entre módulos. |
| [TECNOLOGIAS.md](./TECNOLOGIAS.md) | Stack tecnológico efectivamente utilizado y el papel de cada dependencia. |

---

## Cómo leer la documentación

Se recomienda este orden de lectura:

1. **ESTRUCTURA.md** — para ubicar cada pieza dentro del proyecto.
2. **ARQUITECTURA.md** — para entender cómo se comunican las piezas.
3. **TECNOLOGIAS.md** — para conocer la base tecnológica de cada decisión.

Los diagramas Mermaid se renderizan automáticamente en editores y plataformas
compatibles (GitHub, VS Code con extensión, etc.).

---

## Aplicación en una mirada

- **Nombre**: `turno-go-front`
- **Tipo**: Single Page Application (SPA) en React, desplegada en Vercel con
  rewrite SPA (`vercel.json`).
- **Acceso a datos**: cliente HTTP propio sobre `fetch` (`src/lib/api-client.ts`)
  que consume un backend REST en `http://localhost:8000/api` por defecto
  (`VITE_API_URL`).
- **Roles**: `admin` y `duenio` (ver `src/features/auth/components/ProtectedRoute.tsx`).
- **Manager de paquetes**: pnpm (`pnpm-lock.yaml`).

### Rutas principal

| Ruta | Módulo | Archivo |
|------|--------|---------|
| `/` | Landing pública | `src/features/landing/pages/Index.tsx` |
| `/negocios` | Marketplace | `src/features/business/pages/Negocios.tsx` |
| `/negocio/:slug` | Perfil público de negocio | `src/features/business/pages/NegocioPerfil.tsx` |
| `/reservar/:slug` | Reserva de turno | `src/features/booking/pages/reserva/Reservar.tsx` |
| `/login`, `/registro` | Autenticación | `src/features/auth/pages/Login.tsx`, `Registro.tsx` |
| `/registrar-negocio` | Alta de negocio (wizard) | `src/features/register-business/pages/RegistrarNegocio.tsx` |
| `/dashboard/*` | Panel del dueño | `src/features/dashboard/pages/Dashboard.tsx` |
| `/planes`, `/mi-suscripcion` | Membresía | `src/features/membership/pages/Planes.tsx`, `MiSuscripcion.tsx` |
| `/admin/*` | Panel de administración | `src/features/admin/pages/AdminPanel.tsx` |

La definición completa de rutas está en `src/App.tsx`.

---

## Referencias útiles

- Configuración de build: `vite.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`.
- Estilo y diseño: `tailwind.config.js`, `postcss.config.js`, `src/index.css`, `components.json`.
- Lint y herramientas: `eslint.config.js`.
- Despliegue: `vercel.json`.
- Tests: directorio `src/test/` y archivos `*.test.ts(x)` (ver `src/lib/statistics-utils.test.ts`, `src/utils/format.test.ts`, `src/features/auth/pages/*.test.tsx`).

---

## Convenciones detectadas en el código

- Rutas de importación con alias `@/` → `src/` (definido en `vite.config.ts` y `tsconfig.app.json`).
- Estructura por *feature*: `src/features/<módulo>/` con subcarpetas `pages/`, `components/`, `services/`, `contexts/`, `hooks/`.
- Contratos con el backend tipados en `src/types/api.ts` (prefijos `Api*`, p. ej. `ApiNegocio`, `ApiServicio`).
- Endpoints REST con nombres en español (p. ej. `/negocios/`, `/turnos/`) — ver `src/services/*`.

> **Nota de veracidad**: las secciones de los documentos citados usan rutas y
> símbolos que existen en el código de este repositorio. Si un detalle no pudo
> determinarse a partir del código (p. ej. secretos de entorno), se indica
> explícitamente en el documento correspondiente.