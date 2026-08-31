import { useQuery } from "@tanstack/react-query";
import { obtenerNegociosMapa } from "@/services/business.service";
import type { NegocioMapa } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export const useNegociosMapa = () => {
  return useQuery<NegocioMapa[], Error>({
    queryKey: queryKeys.businesses.mapa(),
    queryFn: () => obtenerNegociosMapa(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
