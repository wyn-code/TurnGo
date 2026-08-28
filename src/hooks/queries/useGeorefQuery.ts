import { useQuery } from "@tanstack/react-query";

import { georefService } from "@/services/georef.service";
import type { ApiProvincia, ApiLocalidad } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export const useProvincias = () =>
  useQuery<ApiProvincia[], Error>({
    queryKey: queryKeys.georef.provinces(),
    queryFn: georefService.getProvincias,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

export const useLocalidades = (idProvincia: number | null | undefined) =>
  useQuery<ApiLocalidad[], Error>({
    queryKey:
      idProvincia == null
        ? ["georef", "localities", "disabled"]
        : queryKeys.georef.localities(idProvincia),
    queryFn: () => georefService.getLocalidades(idProvincia!),
    enabled: idProvincia != null,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

export const useAllLocalidades = () =>
  useQuery<ApiLocalidad[], Error>({
    queryKey: queryKeys.georef.allLocalities(),
    queryFn: georefService.getAllLocalidades,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
