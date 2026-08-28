import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { empleadoService } from "@/services/empleado.service";
import { queryKeys } from "@/lib/query-keys";

export const useGenerarCalendario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      businessId,
      empleadoId,
      email,
    }: {
      businessId: string | number;
      empleadoId: number;
      email: string;
    }) => empleadoService.generarCalendario(businessId, empleadoId, email),

    onSuccess: (_data, variables) => {
      const businessKey = String(variables.businessId);

      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.calendarState(
          businessKey,
          variables.empleadoId,
        ),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.byBusiness(businessKey),
      });
    },

    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, "Error enviando el link de calendario"),
      );
    },
  });
};
export default useGenerarCalendario;
