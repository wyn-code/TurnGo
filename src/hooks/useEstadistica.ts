import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { estadisticaService } from "@/services/estadistica.service";
import type {
  StatisticsCompare,
  StatisticsRange,
} from "@/types/statistics";
import { queryKeys } from "@/lib/query-keys";

export const useStatistics = (
  businessId?: number | string,
  rango: StatisticsRange = "mes",
  comparar: StatisticsCompare = "anterior",
) => {
  return useQuery({
    queryKey:
      businessId == null
        ? ["statistics", "disabled", rango, comparar]
        : queryKeys.statistics.byBusiness(businessId, rango, comparar),
    queryFn: () =>
      estadisticaService.getByBusiness(businessId!, { rango, comparar }),
    enabled: businessId != null,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
};

export default useStatistics;
