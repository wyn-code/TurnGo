import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { empleadoService } from "@/services/empleado.service";

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
        queryKey: [
          "employee-calendar-state",
          businessKey,
          variables.empleadoId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: ["employees", businessKey],
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
