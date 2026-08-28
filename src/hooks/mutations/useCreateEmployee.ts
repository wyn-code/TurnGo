import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { empleadoService } from "@/services/empleado.service";
import type { ApiEmpleado } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id_negocio: number;
      nombre: string;
      apellido: string;
      telefono: string;
      activo: boolean;
    }) => empleadoService.create(data),

    onSuccess: (newEmployee) => {
      const businessKey = String(newEmployee.id_negocio);

      queryClient.setQueriesData<ApiEmpleado[]>(
          { queryKey: queryKeys.employees.byBusiness(businessKey) },
        (old) => {
          const list = old ?? [];
          if (list.some((e) => e.id_empleado === newEmployee.id_empleado)) {
            return list;
          }
          return [...list, newEmployee];
        },
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.byBusiness(businessKey),
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error creando profesional"));
    },
  });
};

export default useCreateEmployee;
