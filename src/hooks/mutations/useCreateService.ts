import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { servicioService, type ServicioCreatePayload } from "@/services/servicio.service";
import type { ApiServicio } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ServicioCreatePayload) => servicioService.create(data),
    onSuccess: (newService) => {
        const businessKey = String(newService.id_negocio);
        queryClient.setQueriesData<ApiServicio[]>(
          { queryKey: queryKeys.services.byBusinessRoot(businessKey) },
          (old) => [...(old ?? []), newService],
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.services.byBusinessRoot(businessKey),
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error creando servicio"));
    },
  });
};

export default useCreateService;
