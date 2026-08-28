import { useQuery } from "@tanstack/react-query";
import { empleadoService } from "@/services/empleado.service";
import type { ApiEmpleado } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query hook para obtener empleados de un negocio
 * Cacheado automáticamente cada 5 minutos
 * @param businessId - ID del negocio (null para deshabilitar)
 * @returns {data, isLoading, error, refetch}
 */
export const useEmployees = (businessId: string | number | null) => {
  return useQuery<ApiEmpleado[], Error>({
    queryKey:
      businessId == null
        ? ["employees", "disabled"]
        : queryKeys.employees.byBusiness(businessId),
    queryFn: () =>
      empleadoService.getByBusiness(businessId as string | number),
    // Solo ejecutar si hay businessId
    enabled: businessId != null,
    // Datos fresco por 5 minutos
    staleTime: 5 * 60 * 1000,
    // Mantener caché por 10 minutos
    gcTime: 10 * 60 * 1000,
  });
};

export default useEmployees;
