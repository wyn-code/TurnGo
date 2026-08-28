import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { empleadoService } from "@/services/empleado.service";
import { queryKeys } from "@/lib/query-keys";

export const useRevocarCalendario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      businessId,
      empleadoId,
    }: {
      businessId: string | number;
      empleadoId: number;
    }) => empleadoService.revocarCalendario(businessId, empleadoId),

    onSuccess: (_data, variables) => {
      const businessKey = String(variables.businessId);

      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.calendarState(
          businessKey,
          variables.empleadoId,
        ),
      });

      toast.success("Acceso al calendario revocado");
    },

    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, "Error revocando el acceso al calendario"),
      );
    },
  });
};
export default useRevocarCalendario;
