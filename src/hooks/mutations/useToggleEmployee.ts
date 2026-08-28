import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { empleadoService } from "@/services/empleado.service";
import type { ApiEmpleado } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export const useToggleEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      empleadoService.toggleStatus(id, activo),

    onSuccess: (updatedEmployee) => {
      const businessKey = String(updatedEmployee.id_negocio);

      queryClient.setQueriesData<ApiEmpleado[]>(
        { queryKey: queryKeys.employees.byBusiness(businessKey) },
        (old) =>
          (old ?? []).map((s) =>
            s.id_empleado === updatedEmployee.id_empleado ? updatedEmployee : s,
          ),
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.byBusiness(businessKey),
      });
    },

    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, "Error cambiando estado del empleado"),
      );
    },
  });
};
export default useToggleEmployee;
