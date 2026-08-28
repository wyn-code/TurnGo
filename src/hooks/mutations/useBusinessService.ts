import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api-error";
import businessService from "@/services/business.service";
import type { ApiNegocio } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export type BusinessConfigChanges = {
  nombre?: string;
  telefono?: string | null;
  wsp?: string;
  ig_url?: string | null;
  direccion?: string;
  ciudad?: string;
  id_localidad?: number | null;
  id_provincia?: number | null;
  logo?: string | null;
};

export const useUpdateBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      business,
      changes,
    }: {
      business: ApiNegocio;
      changes: BusinessConfigChanges;
    }) =>
      businessService.updateBusiness(
        business.id_negocio,
        business,
        changes,
      ),

    onSuccess: (updatedBusiness) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.root() });
      if (updatedBusiness.usuario_id != null) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.businesses.mine(updatedBusiness.usuario_id),
        });
        queryClient.setQueryData(
          queryKeys.businesses.mine(updatedBusiness.usuario_id),
          updatedBusiness,
        );
      }
      if (updatedBusiness.slug) {
        queryClient.setQueryData(queryKeys.businesses.bySlug(updatedBusiness.slug), updatedBusiness);
      }
      toast.success("Configuración guardada correctamente");
    },

    onError: (error: Error) => {
      console.error(error);
      toast.error(
        getApiErrorMessage(error, "Error guardando configuración"),
      );
    },
  });
};
