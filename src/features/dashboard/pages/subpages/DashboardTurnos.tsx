import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, Ban, UserX, CalendarX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useDashboardBusiness } from "@/features/dashboard/contexts/DashboardBusinessContext";
import {
  useAppointments,
  getDayRange,
  getWeekRange,
} from "@/hooks/queries/useAppointmentsQuery";
import { appointmentService } from "@/features/booking/services/appointment.service";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import type { ApiTurno } from "@/types/api";

/**
 * LIMITACIÓN CONOCIDA (QR Check-In sin sesión):
 * Si el usuario escanea un código QR sin tener una sesión activa en el teléfono/dispositivo,
 * `ProtectedRoute` redirigirá automáticamente a /login y el parámetro `?token=` se perderá.
 * Flujo esperado: El dueño/administrador debe haber iniciado sesión previamente en el dispositivo.
 */

const ESTADO = {
  PENDIENTE: 1,
  CONFIRMADO: 2,
  COMPLETADO: 3,
  CANCELADO: 4,
  NO_ASISTIO: 5,
  ASISTIO: 6,
} as const;

const TRANSICIONES_PERMITIDAS: Record<number, number[]> = {
  [ESTADO.PENDIENTE]: [ESTADO.CONFIRMADO, ESTADO.CANCELADO],
  [ESTADO.CONFIRMADO]: [ESTADO.ASISTIO, ESTADO.COMPLETADO, ESTADO.CANCELADO, ESTADO.NO_ASISTIO],
};

const ACCIONES: Record<
  number,
  { label: string; icon: React.ReactNode; variant: "default" | "destructive" | "outline" }
> = {
  [ESTADO.CONFIRMADO]: {
    label: "Confirmar",
    icon: <CheckCircle size={14} />,
    variant: "default",
  },
  [ESTADO.ASISTIO]: {
    label: "Marcar asistido",
    icon: <UserCheck size={14} />,
    variant: "default",
  },
  [ESTADO.COMPLETADO]: {
    label: "Completar",
    icon: <CheckCircle size={14} />,
    variant: "outline",
  },
  [ESTADO.CANCELADO]: {
    label: "Cancelar",
    icon: <Ban size={14} />,
    variant: "destructive",
  },
  [ESTADO.NO_ASISTIO]: {
    label: "No asistió",
    icon: <UserX size={14} />,
    variant: "outline",
  },
};

type ViewMode = "today" | "week";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getClientLabel(appointment: ApiTurno): string {
  const parts = [
    appointment.cliente?.nombre,
    appointment.cliente?.apellido,
  ].filter(Boolean);

  return parts.join(" ") || "Cliente sin nombre";
}

function getStatusLabel(appointment: ApiTurno): string {
  return (
    appointment.estado?.nombre ??
    appointment.estado?.nombre_estado ??
    `Estado #${appointment.id_estado}`
  );
}

const DashboardTurnos = () => {
  const { business, isLoadingBusiness } = useDashboardBusiness();
  const businessId = business?.id_negocio ?? null;
  const businessIdStr = businessId ? String(businessId) : null;
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>("today");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTurnoId, setCancelTurnoId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedId = searchParams.get("turno");
  const highlightedRef = useRef<HTMLDivElement>(null);

  const range = useMemo(
    () => (view === "today" ? getDayRange(new Date()) : getWeekRange(new Date())),
    [view],
  );

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useAppointments(businessIdStr, range);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) =>
          new Date(a.fecha_hora_inicio).getTime() -
          new Date(b.fecha_hora_inicio).getTime(),
      ),
    [appointments],
  );

  const statusMutation = useMutation({
    mutationFn: ({ turnoId, id_estado, rechazado_motivo }: {
      turnoId: number;
      id_estado: number;
      rechazado_motivo?: string;
    }) => appointmentService.changeStatus(turnoId, { id_estado, rechazado_motivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.detail : "Error al cambiar estado";
      toast.error(msg);
    },
  });

  const handleCancel = () => {
    if (!cancelTurnoId || !cancelMotivo.trim()) return;
    statusMutation.mutate(
      { turnoId: cancelTurnoId, id_estado: ESTADO.CANCELADO, rechazado_motivo: cancelMotivo.trim() },
      {
        onSuccess: () => {
          setCancelDialogOpen(false);
          setCancelTurnoId(null);
          setCancelMotivo("");
        },
      },
    );
  };

  const processedTokenRef = useRef<string | null>(null);

  const { mutate: checkInQr } = useMutation({
    mutationFn: appointmentService.qrCheckIn,
    onSuccess: (turnoActualizado) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
      toast.success("Asistencia registrada con éxito");
      
      // Resaltar el turno en la lista
      setSearchParams((prev) => {
        prev.set("turno", turnoActualizado.id_turno.toString());
        return prev;
      });
    },
    onError: (error: unknown) => {
      const detail = error instanceof ApiError ? error.detail : "Error al procesar el código QR";
      toast.error(detail);
    },
  });

  useEffect(() => {
    const token = searchParams.get("token");

    if (token && processedTokenRef.current !== token) {
      processedTokenRef.current = token;

      // Limpiar ?token= de la URL de inmediato manteniendo el resto de params
      setSearchParams((prev) => {
        prev.delete("token");
        return prev;
      }, { replace: true });

      // Disparar el check-in
      checkInQr(token);
    }
  }, [searchParams, setSearchParams, checkInQr]);
  
  useEffect(() => {
    if (highlightedId && sortedAppointments.length > 0) {
      const timer = setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightedId, sortedAppointments.length]);

  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => {
        searchParams.delete("turno");
        setSearchParams(searchParams, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId, searchParams, setSearchParams]);

  if (isLoadingBusiness || (businessId && isLoading)) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Cargando..." />
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CalendarX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Sin negocio vinculado</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No encontramos un negocio vinculado a tu usuario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Gestión de turnos
        </h2>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "today" ? "default" : "outline"}
            onClick={() => setView("today")}
          >
            Hoy
          </Button>
          <Button
            size="sm"
            variant={view === "week" ? "default" : "outline"}
            onClick={() => setView("week")}
          >
            Esta semana
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <CalendarX className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">Error al cargar turnos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {error.message}
              </p>
            </div>
          ) : sortedAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CalendarX className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {view === "today" ? "Sin turnos para hoy" : "Sin turnos esta semana"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {view === "today"
                  ? "Los turnos aparecerán aquí cuando los clientes reserven."
                  : "No hay turnos programados para esta semana."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAppointments.map((appointment) => {
                const transiciones = TRANSICIONES_PERMITIDAS[appointment.id_estado] ?? [];

                return (
                  <div
                    key={appointment.id_turno}
                    ref={String(appointment.id_turno) === highlightedId ? highlightedRef : undefined}
                    className={`flex flex-wrap items-start justify-between gap-2 rounded-lg border p-4 transition-all hover:bg-accent/50 ${
                      String(appointment.id_turno) === highlightedId
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">
                        {appointment.servicio?.nombre_servicio ??
                          `Servicio #${appointment.id_servicio}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getClientLabel(appointment)}
                        {appointment.cliente?.telefono
                          ? ` · ${appointment.cliente.telefono}`
                          : ""}
                      </p>
                      {appointment.empleado ? (
                        <p className="text-sm text-muted-foreground">
                          Profesional:{" "}
                          {[appointment.empleado.nombre, appointment.empleado.apellido]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(appointment.fecha_hora_inicio)}
                      </p>
                      {appointment.rechazado_motivo && (
                        <p className="text-xs text-destructive">
                          Motivo: {appointment.rechazado_motivo}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary">{getStatusLabel(appointment)}</Badge>

                      {transiciones.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {transiciones.map((targetEstado) => {
                            const accion = ACCIONES[targetEstado];
                            if (!accion) return null;

                            if (targetEstado === ESTADO.CANCELADO) {
                              return (
                                <Button
                                  key={targetEstado}
                                  size="sm"
                                  variant={accion.variant}
                                  className="h-7 text-xs gap-1"
                                  disabled={statusMutation.isPending}
                                  onClick={() => {
                                    setCancelTurnoId(appointment.id_turno);
                                    setCancelMotivo("");
                                    setCancelDialogOpen(true);
                                  }}
                                >
                                  {accion.icon}
                                  {accion.label}
                                </Button>
                              );
                            }

                            return (
                              <Button
                                key={targetEstado}
                                size="sm"
                                variant={accion.variant}
                                className="h-7 text-xs gap-1"
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({
                                    turnoId: appointment.id_turno,
                                    id_estado: targetEstado,
                                  })
                                }
                              >
                                {accion.icon}
                                {accion.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ingresá el motivo de la cancelación (mínimo 5 caracteres).
            </p>
            <Textarea
              placeholder="Motivo de cancelación..."
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMotivo.trim().length < 5 || statusMutation.isPending}
              onClick={handleCancel}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Cargando..." />
              ) : (
                "Cancelar turno"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardTurnos;
