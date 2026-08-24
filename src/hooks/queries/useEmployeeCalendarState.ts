import { useQuery } from "@tanstack/react-query";
import { empleadoService } from "@/services/empleado.service";
import type { ApiEmpleadoCalendarioEstadoResponse } from "@/types/api";

/**
 * React Query hook para obtener el estado del calendario de un empleado
 * @param businessId - ID del negocio (null para deshabilitar)
 * @param empleadoId - ID del empleado (null para deshabilitar)
 */
export const useEmployeeCalendarState = (
  businessId: string | number | null,
  empleadoId: number | null,
) => {
  return useQuery<ApiEmpleadoCalendarioEstadoResponse, Error>({
    queryKey: ["employee-calendar-state", businessId, empleadoId],
    queryFn: () =>
      empleadoService.getCalendarioEstado(
        businessId as string | number,
        empleadoId as number,
      ),
    enabled: businessId != null && empleadoId != null,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export default useEmployeeCalendarState;
