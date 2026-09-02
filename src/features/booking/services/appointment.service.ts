import apiClient from "@/lib/api-client";
import type { ApiTurno, ApiTurnoDisponibilidad } from "@/types/api";

export interface CreateAppointmentRequest {
  id_negocio: number;
  id_cliente: number;
  id_servicio: number;
  fecha_hora_inicio: string;
  id_empleado: number | null;
}

export interface ChangeStatusRequest {
  id_estado: number;
  rechazado_motivo?: string;
}

export const appointmentService = {
  createAppointment: async (data: CreateAppointmentRequest): Promise<ApiTurno> => {
    return apiClient.post<ApiTurno>("/turnos/", data);
  },

  getAppointmentById: async (id: string | number): Promise<ApiTurno> => {
    return apiClient.get<ApiTurno>(`/turnos/${id}`);
  },

  getAppointmentsByRange: async (params: {
    id_negocio: string | number;
    desde: string;
    hasta: string;
    id_empleado?: string | number;
  }): Promise<ApiTurno[]> => {
    return apiClient.get<ApiTurno[]>("/turnos/por-rango", params);
  },
  
  updateAppointment: async (
    id: string | number,
    data: Partial<CreateAppointmentRequest>
  ): Promise<ApiTurno> => {
    return apiClient.put<ApiTurno>(`/turnos/${id}`, data);
  },

  changeStatus: async (
    id: string | number,
    data: ChangeStatusRequest
  ): Promise<ApiTurno> => {
    return apiClient.put<ApiTurno>(`/turnos/${id}/estado`, data);
  },

    qrCheckIn: async (token: string): Promise<ApiTurno> => {
    return apiClient.request<ApiTurno>("/turnos/qr/check-in", { 
      method: "POST", 
      params: { token } 
    });
  },

  deleteAppointment: async (id: string | number): Promise<ApiTurno> => {
    return apiClient.delete<ApiTurno>(`/turnos/${id}`);
  },
  
  getDisponibilidad: async (params: {
    id_negocio: string | number;
    desde: string;
    hasta: string;
    id_empleado?: string | number;
  }): Promise<ApiTurnoDisponibilidad[]> => {
    return apiClient.get<ApiTurnoDisponibilidad[]>("/turnos/disponibilidad", params);
  },
};