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
  paciente_dni?: string | null;
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

export const ejecutarPrediccionConsenso = async (pacienteId: number): Promise<PrediccionConsensoResponse> => {
  const response = await api.post<PrediccionConsensoResponse>(`/api/prediccion/consenso/${pacienteId}`);
  return response.data;
};

// ==================== DATOS CLÍNICOS ====================

export interface DatosClinicosResponse {
  id: number;
  paciente_id: number;
  edad_gestacional_semanas: number | null;
  longitud_cervical_mm: number | null;
  embarazo_multiple: boolean;
  parto_prematuro_previo: boolean;
  hipertension_gestacional: boolean;
  bmi: number | null;
  bmi_categoria: string | null;
  num_condiciones_cronicas: number;
  infeccion_activa: boolean;
  diabetes_pregestacional: boolean;
  diabetes_gestacional: boolean;
  hipertension_cronica: boolean;
  eclampsia: boolean;
  hepatitis_b: boolean;
  hepatitis_c: boolean;
  sifilis: boolean;
  clamidia: boolean;
  gonorrea: boolean;
  cesareas_previas: boolean;
  num_cesareas: number;
  num_partos_previos_vivos: number;
  alerta_activa: boolean;
  notas_medicas: string | null;
  created_at: string;
  updated_at: string;
}

export type DatosClinicosInput = Omit<DatosClinicosResponse, 'id' | 'paciente_id' | 'created_at' | 'updated_at'>;

export const getDatosClinicos = async (pacienteId: number): Promise<DatosClinicosResponse> => {
  const response = await api.get<DatosClinicosResponse>(`/api/datos-clinicos/${pacienteId}`);
  return response.data;
};

export const createDatosClinicos = async (pacienteId: number, data: DatosClinicosInput): Promise<DatosClinicosResponse> => {
  const response = await api.post<DatosClinicosResponse>(`/api/datos-clinicos/${pacienteId}`, data);
  return response.data;
};

export const updateDatosClinicos = async (pacienteId: number, data: DatosClinicosInput): Promise<DatosClinicosResponse> => {
  const response = await api.put<DatosClinicosResponse>(`/api/datos-clinicos/${pacienteId}`, data);
  return response.data;
};

// ==================== USUARIO ACTUAL ====================

export interface CurrentUser {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  rol: string;
}

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const response = await api.get<CurrentUser>('/api/usuarios/me');
  return response.data;
};

// ==================== HISTORIAL DE PREDICCIONES ====================

export interface PrediccionHistorialItem {
  id: number;
  paciente_id: number;
  prob_random_forest: number | null;
  prob_catboost: number | null;
  prob_logistica: number | null;
  prob_consenso: number | null;
  semanas_estimadas_rf: number | null;
  semanas_estimadas_cb: number | null;
  semanas_estimadas_logistica: number | null;
  semanas_estimadas_consenso: number | null;
  nivel_riesgo: string | null;
  fecha_prediccion: string;
}

export const getHistorialPredicciones = async (pacienteId: number): Promise<PrediccionHistorialItem[]> => {
  const response = await api.get<PrediccionHistorialItem[]>(`/api/prediccion/historial/${pacienteId}`);
  return response.data;
};

// ==================== TRIAJE ====================

export interface TriajeResumen {
  rojo: number;
  naranja: number;
  amarillo: number;
  verde: number;
}

export type TriajeAlgoritmo = 'consenso' | 'arbol' | 'ordinal';

export interface TriajePriorizadoItem {
  paciente_id: number;
  nombre: string;
  apellidos: string;
  dni: string;
  edad_gestacional_semanas: number | null;
  nivel_urgencia: string;
  score_formula_ponderada: number | null;
  urgencia_arbol: string | null;
  urgencia_ordinal: string | null;
  prob_consenso: number | null;
  semanas_estimadas_consenso: number | null;
  bmi: number | null;
  num_condiciones_cronicas: number | null;
  fecha_triage: string;
  acciones_urgentes: string[] | null;
}

export const getTriajeResumen = async (): Promise<TriajeResumen> => {
  const response = await api.get<TriajeResumen>('/api/triage/resumen');
  return response.data;
};

export const getTriajePriorizados = async (
  nivel?: string,
  algoritmo: TriajeAlgoritmo = 'consenso',
): Promise<TriajePriorizadoItem[]> => {
  const params: Record<string, string> = { algoritmo };
  if (nivel) params.nivel = nivel;
  const response = await api.get<TriajePriorizadoItem[]>('/api/triage/priorizados', { params });
  return response.data;
};

export const sincronizarTriaje = async (): Promise<{ procesados: number }> => {
  const response = await api.post<{ procesados: number }>('/api/triage/sincronizar');
  return response.data;
};

// ==================== RECOMENDACIONES ====================

export interface RecomendacionResponse {
  id: number;
  paciente_id: number;
  prediccion_id: number | null;
  algoritmo: string;
  prioridad: number | null;
  confianza: number | null;
  estado: string;
  titulo: string | null;
  descripcion: string | null;
  notas: string | null;
  fecha_revision: string | null;
  es_manual: boolean;
  origen: string;
  fecha_recomendacion: string;
  intervencion: {
    id: number;
    codigo: string;
    nombre: string;
    categoria: string | null;
  };
}

export const getRecomendacionesPaciente = async (pacienteId: number): Promise<RecomendacionResponse[]> => {
  const response = await api.get<RecomendacionResponse[]>(`/api/recomendaciones/paciente/${pacienteId}`);
  return response.data;
};


// En tu src/services/api.ts

export const getUltimaPrediccion = async (pacienteId: number): Promise<{ prediccion_id: number }> => {
  const response = await api.get(`/api/prediccion/paciente/${pacienteId}/ultima`);
  return response.data;
};

export const ejecutarRecomendacionesS4 = async (pacienteId: number, prediccionId: number): Promise<void> => {
  // Petición exacta según tu esquema de rutas por PATH
  await api.post(`/api/recomendaciones/ejecutar/${pacienteId}/${prediccionId}`);
};
