import { getApiErrorMessage } from "@/lib/api-error";
import empleadoService from "@/services/empleado.service";
import type { ApiEmpleado } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";


export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre?: string;
        apellido?: string;
        telefono?: string;
        activo?: boolean;
      };
    }) => empleadoService.update(id, data),

    onSuccess: (updatedEmployee) => {
      const businessKey = String(updatedEmployee.id_negocio);

      queryClient.setQueriesData<ApiEmpleado[]>(
        { queryKey: queryKeys.employees.byBusiness(businessKey) },
        (old) =>
          (old ?? []).map((e) =>
            e.id_empleado === updatedEmployee.id_empleado ? updatedEmployee : e,
          ),
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.byBusiness(businessKey),
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error actualizando profesional"));
    },
  });
};
