import { useQuery } from "@tanstack/react-query";
import { membershipService } from "@/features/membership/services/membership.service";
import type { ApiPlan, ApiNegocioFunciones, ApiSuscripcion } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export const usePlanes = () =>
  useQuery<ApiPlan[], Error>({
    queryKey: queryKeys.membership.plans(),
    queryFn: () => membershipService.listarPlanes(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const useFuncionesNegocio = (idNegocio: number | null) =>
  useQuery<ApiNegocioFunciones | null, Error>({
    queryKey:
      idNegocio == null
        ? ["membership", "features", "disabled"]
        : queryKeys.membership.features(idNegocio),
    queryFn: () => {
      if (!idNegocio) return null;
      return membershipService.obtenerFuncionesNegocio(idNegocio);
    },
    enabled: idNegocio != null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const useSuscripcionActual = () =>
  useQuery<ApiSuscripcion | null, Error>({
    queryKey: queryKeys.membership.current(),
    queryFn: () => membershipService.obtenerSuscripcionActual(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
