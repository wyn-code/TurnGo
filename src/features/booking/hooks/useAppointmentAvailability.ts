import { useQuery } from "@tanstack/react-query";
import { appointmentService } from "@/features/booking/services/appointment.service";
import { queryKeys, type QueryEntityId } from "@/lib/query-keys";
import type { ApiTurnoDisponibilidad } from "@/types/api";

export type AppointmentAvailabilityParams = {
  businessId: QueryEntityId;
  desde: string;
  hasta: string;
  employeeId?: QueryEntityId | null;
};

export function useAppointmentAvailability(
  params: AppointmentAvailabilityParams | null,
) {
  return useQuery<ApiTurnoDisponibilidad[], Error>({
    queryKey:
      params == null
        ? ["appointments", "availability", "disabled"]
        : queryKeys.appointments.availability(
            params.businessId,
            params.desde,
            params.hasta,
            params.employeeId,
          ),
    queryFn: () => {
      if (params == null) return [];

      return appointmentService.getDisponibilidad({
        id_negocio: params.businessId,
        desde: params.desde,
        hasta: params.hasta,
        ...(params.employeeId != null && { id_empleado: params.employeeId }),
      });
    },
    enabled: params != null,
    staleTime: 0,
  });
}
