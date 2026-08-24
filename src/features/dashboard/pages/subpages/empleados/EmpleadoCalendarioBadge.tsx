import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  CalendarClock,
  CalendarOff,
} from "lucide-react";
import type {
  ApiEmpleadoCalendarioEstado,
  ApiEmpleado,
} from "@/types/api";
import { useEmployeeCalendarState } from "@/hooks/queries/useEmployeeCalendarState";

const ESTADOS_CONFIG: Record<
  ApiEmpleadoCalendarioEstado,
  { label: string; icon: typeof CalendarCheck; className: string }
> = {
  activo: {
    label: "Calendario activo",
    icon: CalendarCheck,
    className: "bg-emerald-500/10 text-emerald-600",
  },
  revocado: {
    label: "Calendario revocado",
    icon: CalendarOff,
    className: "bg-destructive/10 text-destructive",
  },
  sin_calendario: {
    label: "Sin calendario",
    icon: CalendarClock,
    className: "text-muted-foreground",
  },
};

interface EmpleadoCalendarioBadgeProps {
  businessId: string | number | null;
  employee: ApiEmpleado;
}

export function EmpleadoCalendarioBadge({
  businessId,
  employee,
}: EmpleadoCalendarioBadgeProps) {
  const { data } = useEmployeeCalendarState(
    businessId,
    employee.id_empleado,
  );

  if (!data) return null;

  const config = ESTADOS_CONFIG[data.estado];
  const Icon = config.icon;

  return (
    <Badge
      variant={data.estado === "sin_calendario" ? "outline" : "secondary"}
      className={`gap-1 ${config.className}`}
      title={data.estado === "activo"
        ? "El profesional tiene un feed de Google Calendar activo"
        : data.estado === "revocado"
          ? "El último link de calendario fue revocado"
          : "Este profesional todavía no tiene calendario"}
    >
      <Icon size={12} />
      <span className="hidden xl:inline">{config.label}</span>
    </Badge>
  );
}
