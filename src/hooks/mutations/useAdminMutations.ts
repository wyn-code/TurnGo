import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiNegocio, ApiUsuario } from "@/types/api";
import { businessService } from "@/services/business.service";
import {
  userService,
  type UpdateUserRequest,
} from "@/services/user.service";
import { queryKeys } from "@/lib/query-keys";

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiUsuario, Error, { id: number; data: UpdateUserRequest }>({
    mutationFn: ({ id, data }) => userService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.admin() }),
  });
};

export const useToggleAdminUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiUsuario, Error, { id: number; estado: boolean }>({
    mutationFn: ({ id, estado }) => userService.toggleStatus(id, estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.admin() }),
  });
};

export const useDeleteAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: userService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.admin() }),
  });
};

export const useUpdateAdminBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiNegocio, Error, { id: number; data: Partial<ApiNegocio> }>({
    mutationFn: ({ id, data }) => businessService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.businesses.root() }),
  });
};

export const useDeleteAdminBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: businessService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.businesses.root() }),
  });
};
