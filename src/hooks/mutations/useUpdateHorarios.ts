import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { horarioService, type BusinessSchedulePayload } from "@/services/horario.service";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query mutation hook para actualizar/crear horarios
 * Invalida automáticamente el caché de horarios tras éxito
 * @returns {mutateAsync, isPending, error}
 */
export const useUpdateHorarios = ({ showErrorToast = true } = {}) => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    {
      businessId: number;
      horarios: BusinessSchedulePayload[];
      hasExisting: boolean;
    }
  >({
    mutationFn: async ({ businessId, horarios, hasExisting }) => {
      return horarioService.createOrUpdate(businessId, horarios, hasExisting);
    },
    // ✅ Invalidar caché tras actualizar
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.schedules.byBusiness(businessId),
      });
    },
    onError: (error) => {
      if (showErrorToast) {
        toast.error(getApiErrorMessage(error, "Error guardando horarios"));
      }
    },
  });
};

export default useUpdateHorarios;
