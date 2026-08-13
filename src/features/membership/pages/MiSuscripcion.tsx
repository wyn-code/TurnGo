import { useNavigate } from "react-router-dom";
import { useSuscripcionActual } from "@/features/membership/hooks/useMembershipQuery";
import {
  useCancelarSuscripcion,
  useToggleRenovacion,
} from "@/features/membership/hooks/useMembershipMutations";
import { useMembership } from "@/features/membership/contexts/MembershipContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, X, ArrowUpCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

const FEATURE_LABELS: Record<string, string> = {
  empleados_ilimitados: "Empleados ilimitados",
  turnos_ilimitados: "Turnos ilimitados",
  recordatorio_email: "Recordatorios por email",
  recordatorio_whatsapp: "Recordatorios por WhatsApp",
  mapa_ubicacion: "Mapa de ubicación",
  imagenes_personalizadas: "Imágenes personalizadas",
  soporte_prioritario: "Soporte prioritario",
};

const ALL_FEATURES = Object.keys(FEATURE_LABELS);

const ESTADO_BADGE: Record<string, string> = {
  activa: "bg-green-100 text-green-800 hover:bg-green-100",
  pendiente: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  vencida: "bg-red-100 text-red-800 hover:bg-red-100",
  cancelada: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  fallida: "bg-red-100 text-red-800 hover:bg-red-100",
};

export default function MiSuscripcion() {
  const navigate = useNavigate();
  const { planActual, funciones, isFree, refresh } = useMembership();
  const { data: suscripcion, isLoading, error } = useSuscripcionActual();
  const { mutateAsync: cancelar, isPending: cancelando } =
    useCancelarSuscripcion();
  const { mutateAsync: toggleRenovacion } = useToggleRenovacion();

  const handleCancel = async () => {
    if (!suscripcion) return;
    try {
      await cancelar(suscripcion.id_suscripcion);
      refresh();
    } catch {
      // handled by toast
    }
  };

  const handleToggleRenovacion = async (activa: boolean) => {
    if (!suscripcion) return;
    try {
      await toggleRenovacion({
        idSuscripcion: suscripcion.id_suscripcion,
        activa,
      });
    } catch {
      // handled by toast
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-destructive">
          Error al cargar la suscripción.
        </p>
        <Button variant="outline" onClick={() => refresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (isFree && !suscripcion) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Mi Suscripción
          </h2>
          <Badge variant="outline">
            Plan Free
          </Badge>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Todavía no tenés una suscripción activa.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/dashboard/planes")}
          >
            <ArrowUpCircle className="mr-2 h-5 w-5" />
            Ver planes disponibles
          </Button>
        </div>
      </div>
    );
  }

  const estado = suscripcion?.estado ?? "activa";
  const diasRestantes = suscripcion?.fecha_fin
    ? differenceInDays(new Date(suscripcion.fecha_fin), new Date())
    : 0;
  const isVencida = diasRestantes < 0;
  const isActiva = estado === "activa" && !isVencida;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Mi Suscripción
        </h2>
        <Badge className={ESTADO_BADGE[estado] ?? ""}>
          {estado.charAt(0).toUpperCase() + estado.slice(1)}
        </Badge>
      </div>

      {isVencida && estado === "activa" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-800">
          Tu suscripción venció. Renová para seguir accediendo a todas las
          funcionalidades.
          <Button
            variant="link"
            className="text-red-800 underline"
            onClick={() => navigate("/dashboard/planes")}
          >
            Renovar ahora
          </Button>
        </div>
      )}

      {estado === "pendiente" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center text-sm text-yellow-800">
          Tu pago está pendiente de confirmación. Las funcionalidades del
          plan se activarán apenas se acredite.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plan actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">
                {suscripcion?.plan.nombre ?? planActual ?? "Free"}
              </p>
              {suscripcion && (
                <p className="text-sm text-muted-foreground">
                  ${suscripcion.plan.precio.toLocaleString("es-AR")}/mes
                </p>
              )}
            </div>
          </div>

          {suscripcion && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Inicio</p>
                <p className="font-medium">
                  {format(new Date(suscripcion.fecha_inicio), "dd/MM/yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Fin</p>
                <p className="font-medium">
                  {format(new Date(suscripcion.fecha_fin), "dd/MM/yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          )}

          {suscripcion && isActiva && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Días restantes
                </p>
                <p className="text-lg font-bold">{diasRestantes}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Renovación automática
                </span>
                <Switch
                  checked={suscripcion.renovacion_automatica}
                  onCheckedChange={handleToggleRenovacion}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {ALL_FEATURES.map((key) => {
              const included = funciones.includes(key);
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 text-sm"
                >
                  {included ? (
                    <Check className="h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={
                      included ? "" : "text-muted-foreground"
                    }
                  >
                    {FEATURE_LABELS[key]}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {suscripcion && isActiva && (
        <div className="flex justify-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={cancelando}>
                Cancelar suscripción
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Cancelar suscripción?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Vas a perder acceso a las funcionalidades del plan al
                  finalizar el período facturado. Esta acción no se puede
                  deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel}>
                  Cancelar suscripción
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
