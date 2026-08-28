import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { servicioService } from "@/services/servicio.service";
import type { ApiServicio } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export const useToggleService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => servicioService.toggleStatus(id),
    onSuccess: (updatedService) => {
      const businessKey = String(updatedService.id_negocio);

      queryClient.setQueriesData<ApiServicio[]>(
        { queryKey: queryKeys.services.byBusinessRoot(businessKey) },
        (old) =>
          (old ?? []).map((s) =>
            s.id_servicio === updatedService.id_servicio ? updatedService : s,
          ),
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.services.byBusinessRoot(businessKey),
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error cambiando estado del servicio"));
    },
  });
};

export default useToggleService;
