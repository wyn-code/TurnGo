import { useQuery } from "@tanstack/react-query";
import { servicioService } from "@/services/servicio.service";
import type { ApiServicio } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export type ServicesQueryOptions = {
  /** Incluir servicios inactivos/eliminados (soft-delete en el backend). */
  includeInactive?: boolean;
};

export const getServicesQueryKey = (
  businessId: string | number | null,
  options?: ServicesQueryOptions,
) =>
  businessId == null
    ? ["services", "disabled", { includeInactive: options?.includeInactive ?? false }] as const
    : queryKeys.services.byBusiness(businessId, options?.includeInactive ?? false);

/**
 * Hook para obtener servicios de un negocio con caché de React Query.
 * Por defecto solo devuelve servicios activos (los "eliminados" quedan con activo=false).
 */
export const useServices = (
  businessId: string | number | null,
  options?: ServicesQueryOptions,
) => {
  const includeInactive = options?.includeInactive ?? false;

  return useQuery<ApiServicio[], Error>({
    queryKey: getServicesQueryKey(businessId, { includeInactive }),
    queryFn: () => {
      if (!businessId) return [];
      return servicioService.getByBusiness(businessId, { includeInactive });
    },
    enabled: businessId != null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export default useServices;
