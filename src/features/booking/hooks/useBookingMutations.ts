import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  appointmentService,
  type CreateAppointmentRequest,
} from "@/features/booking/services/appointment.service";
import {
  clientService,
  type GetOrCreateClientRequest,
} from "@/services/cliente.service";
import { queryKeys } from "@/lib/query-keys";

export function useUpsertClient() {
  return useMutation({
    mutationFn: (data: GetOrCreateClientRequest) => clientService.upsertClient(data),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentRequest) =>
      appointmentService.createAppointment(data),
    onSuccess: async (_appointment, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.availabilityRoot(variables.id_negocio),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byRangeRoot(variables.id_negocio),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.statistics.byBusinessRoot(variables.id_negocio),
        }),
      ]);
    },
  });
}
