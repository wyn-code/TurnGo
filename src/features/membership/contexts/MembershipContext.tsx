import { createContext, useContext, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useFuncionesNegocio } from "@/features/membership/hooks/useMembershipQuery";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface MembershipContextType {
  planActual: string | null;
  estadoSuscripcion: string | null;
  fechaFin: string | null;
  funciones: string[];
  isFree: boolean;
  tieneFuncion: (featureKey: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | null>(null);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const negocioId = user?.hasBusiness ? user.negocioId ?? null : null;

  const { data: funcionesData, isLoading } = useFuncionesNegocio(negocioId);

  const planActual = funcionesData?.plan ?? null;
  const estadoSuscripcion = funcionesData?.estado ?? null;
  const fechaFin = funcionesData?.fecha_fin ?? null;
  const funciones = useMemo(() => funcionesData?.funciones ?? [], [funcionesData?.funciones]);
  const isFree = !planActual;

  const tieneFuncion = useCallback(
    (featureKey: string): boolean => {
      return funciones.includes(featureKey);
    },
    [funciones]
  );

  const refresh = useCallback(async () => {
    if (negocioId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.membership.features(negocioId),
      });
    }
  }, [negocioId, queryClient]);

  return (
    <MembershipContext.Provider
      value={{
        planActual,
        estadoSuscripcion,
        fechaFin,
        funciones,
        isFree,
        tieneFuncion,
        loading: isLoading,
        refresh,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const ctx = useContext(MembershipContext);
  if (!ctx) {
    throw new Error(
      "useMembership must be used within MembershipProvider"
    );
  }
  return ctx;
}
