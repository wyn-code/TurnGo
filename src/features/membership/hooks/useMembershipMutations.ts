import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { membershipService } from "@/features/membership/services/membership.service";
import { queryKeys } from "@/lib/query-keys";

export const useCrearPreferencia = () =>
  useMutation({
    mutationFn: (idPlan: number) =>
      membershipService.crearPreferenciaPago(idPlan),
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, "Error al crear el pago")
      );
    },
  });

export const useCancelarSuscripcion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idSuscripcion: number) =>
      membershipService.cancelarSuscripcion(idSuscripcion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.membership.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.membership.root() });
      toast.success("Suscripción cancelada correctamente");
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, "Error al cancelar la suscripción")
      );
    },
  });
};

export const useToggleRenovacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idSuscripcion,
      activa,
    }: {
      idSuscripcion: number;
      activa: boolean;
    }) =>
      membershipService.toggleRenovacionAutomatica(idSuscripcion, activa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.membership.current() });
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, "Error al actualizar renovación automática")
      );
    },
  });
};
