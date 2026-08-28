import { useQuery } from "@tanstack/react-query";
import { horarioService } from "@/services/horario.service";
import type { ApiHorario } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query hook para obtener horarios de un negocio
 * Cacheado automáticamente cada 5 minutos
 * @param businessId - ID del negocio (null para deshabilitar)
 * @returns {data, isLoading, error, refetch}
 */
export const useHorarios = (businessId: string | number | null) => {
  return useQuery<ApiHorario[], Error>({
    queryKey:
      businessId == null
        ? ["schedules", "disabled"]
        : queryKeys.schedules.byBusiness(businessId),
    queryFn: () =>
      horarioService.getByBusiness(businessId as string | number),
    // Solo ejecutar si hay businessId
    enabled: businessId != null,
    // Datos fresco por 5 minutos
    staleTime: 5 * 60 * 1000,
    // Mantener caché por 10 minutos
    gcTime: 10 * 60 * 1000,
  });
};

export default useHorarios;
