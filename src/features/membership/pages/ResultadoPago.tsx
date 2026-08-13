import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useMembership } from "@/features/membership/contexts/MembershipContext";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

type PaymentStatus = "approved" | "failure" | "pending" | null;

const STATUS_CONFIG = {
  approved: {
    icon: CheckCircle2,
    title: "¡Pago exitoso!",
    description:
      "Tu suscripción ya está activa. Ya podés disfrutar de todas las funcionalidades de tu plan.",
    color: "text-green-500",
  },
  failure: {
    icon: XCircle,
    title: "El pago no pudo completarse",
    description:
      "Ocurrió un error al procesar el pago. Podés intentarlo de nuevo.",
    color: "text-destructive",
  },
  pending: {
    icon: Clock,
    title: "Pago en proceso",
    description:
      "Estamos esperando la confirmación del pago. Te notificaremos cuando se acredite.",
    color: "text-yellow-500",
  },
};

export default function ResultadoPago() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useMembership();
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [status] = useState<PaymentStatus>(
    (searchParams.get("status") as PaymentStatus) ?? null
  );

  useEffect(() => {
    if (status === "approved") {
      void refreshUser();
      void refresh();
      queryClient.invalidateQueries({
        queryKey: ["suscripcion-actual"],
      });
      queryClient.invalidateQueries({
        queryKey: ["funciones-negocio"],
      });
    }
  }, [status, refresh, refreshUser, queryClient]);

  if (!status) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            No hay información de pago disponible.
          </p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <Icon className={`mx-auto mb-4 h-16 w-16 ${config.color}`} />
        <h1 className="mb-2 text-2xl font-bold">{config.title}</h1>
        <p className="mb-8 text-muted-foreground">
          {config.description}
        </p>

        <div className="flex justify-center gap-4">
          {status === "approved" && (
            <Button onClick={() => navigate("/dashboard/mi-suscripcion")}>
              Ver mi suscripción
            </Button>
          )}
          {status === "failure" && (
            <Button onClick={() => navigate("/dashboard/planes")}>
              Reintentar
            </Button>
          )}
          {status === "pending" && (
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/mi-suscripcion")}
            >
              Ir a mi suscripción
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            Ir al dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
