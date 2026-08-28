import { useQuery } from "@tanstack/react-query";
import type { ApiNegocio, ApiUsuario } from "@/types/api";
import { businessService } from "@/services/business.service";
import { userService } from "@/services/user.service";
import { queryKeys } from "@/lib/query-keys";

export const useAdminUsers = () =>
  useQuery<ApiUsuario[], Error>({
    queryKey: queryKeys.users.admin(),
    queryFn: userService.getAllAdmin,
  });

export const useAdminBusinesses = () =>
  useQuery<ApiNegocio[], Error>({
    queryKey: queryKeys.businesses.admin(),
    queryFn: businessService.getAllAdmin,
  });
