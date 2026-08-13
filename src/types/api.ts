export interface ApiUsuario {
  id_us: number;
  usuario_us: string;
  email_us: string;

  role_us?: string;
  rol?: string;

  estado: boolean;

  negocio?: string | null;
  membresia?: string | null;
}

export interface ApiCategory {
  id_categoria: number;
  nombre: string;
  icono?: string | null;
  slug?: string;
  created_at?: string;
  descripcion?: string | null;
}

export interface ApiProvincia {
  id_provincia: number;
  nombre: string;
}

export interface ApiLocalidad {
  id_localidad: number;
  nombre: string;
}

export interface ApiNegocio {
  id_negocio: number;
  nombre: string;
  id_categoria: number;
  wsp: string;
  telefono: string | null;
  direccion: string;
  ciudad: string;
  id_localidad: number | null;
  id_provincia: number | null;
  localidad_nombre?: string | null;
  provincia_nombre?: string | null;
  ig_url: string | null;
  logo: string | null;
  activo: boolean;
  creado_at: string;
  usuario_id: number | null;
  slug: string;

  descripcion?: string;

  categoria?: {
    id_categoria: number;
    nombre: string;
    icono?: string | null;
    descripcion?: string | null;
  } | null;

  imagenes?: {
    id_imagen: number;
    url: string;
    es_portada: boolean;
    orden: number;
  }[];

  latitud: number | null;
  longitud: number | null;
  tiene_mapa?: boolean;
    
  horarios?: ApiHorario[];
  }

export interface ApiServicio {
  id_servicio: number;
  id_negocio: number;
  nombre_servicio: string;
  precio: number;
  requiere_aprobacion?: boolean;
  duracion_min: number;
  duracion_max: number;
  activo: boolean;
}

export interface ApiEmpleado {
  id_empleado: number;
  id_negocio: number;
  nombre: string;
  apellido: string;
  telefono: string;
  activo: boolean;
}

export interface ApiTurno {
  id_turno: number;
  id_negocio: number;
  id_cliente: number;
  id_servicio: number;
  id_estado: number;
  id_empleado: number | null;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  rechazado_motivo?: string | null;
  cliente?: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
  };
  empleado?: {
    nombre?: string;
    apellido?: string;
  } | null;
  servicio?: {
    nombre_servicio?: string;
  };
  estado?: {
    id_estado?: number;
    nombre?: string;
    nombre_estado?: string;
  };
}

export interface ApiHorario {
  id_horarios_negocio?: number;
  id_negocio?: number;
  dia_semana: number;
  hora_apertura: string;
  hora_cierre: string;
  activo: true;
}

export interface BookingData {
  serviceId: string;
  professionalId: string;
  date: Date | null;
  timeSlot: string;
  client: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    notes: string;
  };
}

export interface Benefit {
  icon: string;
  title: string;
  description: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
}

export interface City {
  id: string;
  name: string;
  slug: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string;
  time: string;
  status: "confirmado" | "pendiente" | "cancelado" | "completado";
  notes?: string;
}

export interface DaySchedule {
  open: boolean;
  start: string;
  end: string;
  start2?: string;
  end2?: string;
}

export type WeekSchedule = Record<string, DaySchedule>;

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}


export interface NegocioMapa {
  id_negocio: number;
  nombre: string;
  latitud: number;
  longitud: number;
}

export interface ApiPlan {
  id_plan: number;
  nombre: string;
  precio: number;
  duracion_dias: number;
  descripcion: string | null;
  activo: boolean;
  feature_keys: string[];
}

export interface ApiSuscripcion {
  id_suscripcion: number;
  estado: "activa" | "pendiente" | "vencida" | "cancelada" | "fallida";
  fecha_inicio: string;
  fecha_fin: string;
  renovacion_automatica: boolean;
  plan: ApiPlan;
}

export interface ApiNegocioFunciones {
  id_negocio: number;
  plan: string | null;
  estado: string | null;
  fecha_fin: string | null;
  funciones: string[];
}

export interface ApiCrearPreferenciaResponse {
  init_point: string;
  preference_id: string;
}

// Aliases de compatibilidad para transición gradual
export type ApiBusiness = ApiNegocio;
export type ApiService = ApiServicio;
export type ApiEmployee = ApiEmpleado;