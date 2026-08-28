/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessService, type CreateCompleteBusinessRequest } from "@/services/business.service";
import { servicioService } from "@/services/servicio.service";
import { empleadoService } from "@/services/empleado.service";
import { queryKeys } from "@/lib/query-keys";

// Hook para crear un negocio
export const useCreateBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    CreateCompleteBusinessRequest
  >({
    mutationFn: (data) => businessService.createCompleteBusiness(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.root() });
      if (data && typeof data === "object" && "slug" in data) {
        queryClient.setQueryData(queryKeys.businesses.bySlug((data as any).slug), data);
      }
    },
    onError: (error: Error) => {
      console.error("Error creating business:", error);
    },
  });
};

// Hook para obtener todos los negocios
export const useBusinesses = (params?: { category?: string; city?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: queryKeys.businesses.all(params),
    queryFn: () => businessService.getAllBusinesses(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};


// Hook para obtener un negocio por usuario
export const useMyBusiness = (usuarioId?: string | number) => {
  return useQuery({
    queryKey: usuarioId == null ? ["businesses", "mine", null] : queryKeys.businesses.mine(usuarioId),
    queryFn: () => businessService.getMyBusiness(usuarioId),
    enabled: usuarioId != null,
    staleTime: 2 * 60 * 1000,
  });
};

// Hook para obtener un negocio por slug
export const useBusinessBySlug = (slug: string) => {
  return useQuery({
    queryKey: queryKeys.businesses.bySlug(slug),
    queryFn: () => businessService.getBusinessBySlug(slug),
    staleTime: 10 * 60 * 1000, // 10 minutos
    enabled: !!slug,
  });
};

// Hook para obtener servicios de un negocio
export const useBusinessServices = (businessId: string | number) => {
  return useQuery({
    queryKey: queryKeys.services.byBusiness(businessId),
    queryFn: () => servicioService.getByBusiness(businessId),
    enabled: !!businessId,
  });
};

// Hook para obtener profesionales de un negocio
export const useBusinessProfessionals = (businessId: string | number) => {
  return useQuery({
    queryKey: queryKeys.employees.byBusiness(businessId),
    queryFn: () => empleadoService.getByBusiness(businessId),
    enabled: !!businessId,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: businessService.getCategories,
    staleTime: 1000 * 60 * 60,
  });
};

