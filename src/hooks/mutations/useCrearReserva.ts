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
import type { ApiTurno } from "@/types/api";

export type CrearReservaInput = {
  client: GetOrCreateClientRequest;
  appointment: Omit<CreateAppointmentRequest, "id_cliente">;
};

export const useCrearReserva = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiTurno, Error, CrearReservaInput>({
    mutationFn: async ({ client, appointment }) => {
      const cliente = await clientService.upsertClient(client);

      return appointmentService.createAppointment({
        ...appointment,
        id_cliente: cliente.id_cliente,
      });
    },
    onSettled: async (_data, _error, variables) => {
      if (!variables) return;

      const businessId = variables.appointment.id_negocio;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.availabilityRoot(businessId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byRangeRoot(businessId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.statistics.byBusinessRoot(businessId),
        }),
      ]);
    },
  });
};
