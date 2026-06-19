import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el token JWT en cada petición automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar el error 401 (Token expirado o inválido)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== INTERFACES Y MODELOS ====================

export interface DashboardResumen {
  total_pacientes: number;
  citas_hoy: number;
  citas_pendientes_confirmacion: number;
  citas_semana: number;
  pacientes_sin_cita: number;
}

export interface MedicoResumen {
  id: number;
  nombre: string;
  apellidos: string;
}

export interface CitaCreate {
  paciente_id: number;
  medico_id: number;
  fecha_hora: string; // ISO 8601 string
  duracion_minutos?: number;
  motivo?: string | null;
  notas?: string | null;
}

export interface CitaUpdate {
  fecha_hora?: string | null;
  medico_id?: number | null;
  estado?: 'programada' | 'en_atencion' | 'cumplida' | 'cancelada' | null;
  motivo?: string | null;
  notas?: string | null;
  duracion_minutos?: number | null;
}

export interface CitaResponse {
  id: number;
  paciente_id: number;
  medico_id: number;
  fecha_hora: string;
  duracion_minutos: number;
  estado: 'programada' | 'en_atencion' | 'cumplida' | 'cancelada';
  motivo: string | null;
  notas: string | null;
  created_at: string;
}

export interface CitaResponseEnriquecida extends CitaResponse {
  paciente_nombre: string | null;
  medico_nombre: string | null;
  semanas_gestacion: number | null;
  nivel_riesgo: string | null;
}

export interface PacienteCreate {
  dni: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string; // YYYY-MM-DD
  telefono_principal?: string | null;
  email?: string | null;
  medico_asignado_id?: number | null;
}

export interface PacienteResponse {
  id: number;
  dni: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono_principal: string | null;
  email: string | null;
  medico_asignado_id: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PacienteListResponse {
  items: PacienteResponse[];
  total: number;
  page: number;
  pages: number;
}



// ==================== SERVICIOS API ====================

export const getDashboardResumen = async (): Promise<DashboardResumen> => {
  const response = await api.get<DashboardResumen>('/api/dashboard/resumen');
  return response.data;
};

export const getCitas = async (fecha?: string, medicoId?: number, estado?: string): Promise<CitaResponseEnriquecida[]> => {
  const params: Record<string, string | number> = {};
  if (fecha) params.fecha = fecha;
  if (medicoId) params.medico_id = medicoId;
  if (estado) params.estado = estado;
  
  const response = await api.get<CitaResponseEnriquecida[]>('/api/citas/', { params });
  return response.data;
};

export const getCitaById = async (id: number): Promise<CitaResponseEnriquecida> => {
  const response = await api.get<CitaResponseEnriquecida>(`/api/citas/${id}`);
  return response.data;
};

export const createCita = async (data: CitaCreate): Promise<CitaResponse> => {
  const response = await api.post<CitaResponse>('/api/citas/', data);
  return response.data;
};

export const updateCita = async (id: number, data: CitaUpdate): Promise<CitaResponseEnriquecida> => {
  const response = await api.put<CitaResponseEnriquecida>(`/api/citas/${id}`, data);
  return response.data;
};

export const deleteCita = async (id: number): Promise<CitaResponse> => {
  const response = await api.delete<CitaResponse>(`/api/citas/${id}`);
  return response.data;
};

export const changeCitaEstado = async (id: number, estado: 'programada' | 'en_atencion' | 'cumplida' | 'cancelada'): Promise<CitaResponse> => {
  const response = await api.put<CitaResponse>(`/api/citas/${id}/estado`, { estado });
  return response.data;
};

export const getMedicos = async (): Promise<MedicoResumen[]> => {
  const response = await api.get<MedicoResumen[]>('/api/usuarios/medicos');
  return response.data;
};

export const getPacientes = async (q?: string, page = 1, limit = 100): Promise<PacienteListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (q) params.q = q;
  const response = await api.get<PacienteListResponse>('/api/pacientes/', { params });
  return response.data;
};

export interface GetPacientesParams {
  q?: string;
  estado?: string;
  medico_id?: number;
  mes_registro?: number;
  page?: number;
  limit?: number;
}

export const getPacientesFiltered = async (params: GetPacientesParams = {}): Promise<PacienteListResponse> => {
  const { q, estado, medico_id, mes_registro, page = 1, limit = 20 } = params;
  const qp: Record<string, string | number> = { page, limit };
  if (q) qp.q = q;
  if (estado) qp.estado = estado;
  if (medico_id) qp.medico_id = medico_id;
  if (mes_registro) qp.mes_registro = mes_registro;
  const response = await api.get<PacienteListResponse>('/api/pacientes/', { params: qp });
  return response.data;
};

export const getPacienteById = async (id: number): Promise<PacienteResponse> => {
  const response = await api.get<PacienteResponse>(`/api/pacientes/${id}`);
  return response.data;
};

export interface PacienteUpdatePayload {
  nombre?: string;
  apellidos?: string;
  fecha_nacimiento?: string;
  telefono_principal?: string | null;
  email?: string | null;
  medico_asignado_id?: number | null;
  activo?: boolean;
}

export const updatePaciente = async (id: number, data: PacienteUpdatePayload): Promise<PacienteResponse> => {
  const response = await api.put<PacienteResponse>(`/api/pacientes/${id}`, data);
  return response.data;
};

export const deletePaciente = async (id: number): Promise<PacienteResponse> => {
  const response = await api.delete<PacienteResponse>(`/api/pacientes/${id}`);
  return response.data;
};

export const createPaciente = async (data: PacienteCreate): Promise<PacienteResponse> => {
  const response = await api.post<PacienteResponse>('/api/pacientes/', data);
  return response.data;
};

// ==================== PREDICCIONES Y PERFIL DE PACIENTE ====================

export interface ModeloConsensoItem {
  prob_prematuro: number;
  semanas_estimadas: number;
}

export interface ModelosConsenso {
  random_forest: ModeloConsensoItem;
  catboost: ModeloConsensoItem;
  svm: ModeloConsensoItem;
}

export interface PrediccionUltimaResponse {
  prediccion_id?: number | null;
  prob_consenso?: number | null;
  nivel_riesgo?: string | null;
  modelos?: ModelosConsenso | null;
  fecha_prediccion?: string | null;
}

export interface PrediccionConsensoResponse {
  prediccion_id: number;
  prob_consenso: number;
  nivel_riesgo: string;
  modelos: ModelosConsenso;
}

export interface PacientePerfilResponse {
  id: number;
  dni: string;
  nombre: string;
  apellidos: string;
  telefono_principal?: string | null;
  email?: string | null;
  edad_madre?: number | null;
  edad_gestacional_semanas?: number | null;
  longitud_cervical_mm?: number | null;
  embarazo_multiple?: boolean | null;
  parto_prematuro_previo?: boolean | null;
  hipertension_gestacional?: boolean | null;
  bmi?: number | null;
  num_condiciones_cronicas?: number | null;
  infeccion_activa?: boolean | null;
  prob_consenso?: number | null;
  nivel_riesgo?: string | null;
  semanas_estimadas_consenso?: number | null;
  nivel_urgencia?: string | null;
  medico_nombre?: string | null;
  fecha_ultima_prediccion?: string | null;
  fecha_ultimo_triage?: string | null;
}

export const getPacientePerfil = async (pacienteId: number): Promise<PacientePerfilResponse> => {
  const response = await api.get<PacientePerfilResponse>(`/api/pacientes/${pacienteId}/perfil`);
  return response.data;
};

export const getUltimaPrediccion = async (pacienteId: number): Promise<PrediccionUltimaResponse> => {
  const response = await api.get<PrediccionUltimaResponse>(`/api/prediccion/paciente/${pacienteId}/ultima`);
  return response.data;
};

export const ejecutarPrediccionConsenso = async (pacienteId: number): Promise<PrediccionConsensoResponse> => {
  const response = await api.post<PrediccionConsensoResponse>(`/api/prediccion/consenso/${pacienteId}`);
  return response.data;
};