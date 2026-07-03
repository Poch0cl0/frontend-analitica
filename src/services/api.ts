import { api } from './client';

export { api, API_BASE_URL } from './client';

// ==================== INTERFACES Y MODELOS ====================

export interface DashboardResumen {
  total_pacientes: number;
  citas_hoy: number;
  citas_pendientes_confirmacion: number;
  citas_pendientes_activas: number;
  citas_semana: number;
  pacientes_sin_cita: number;
}

export type AnalyticsGranularidad = 'day' | 'week' | 'month' | 'year';

export interface DashboardAnalyticsTotales {
  total_usuarios: number;
  total_pacientes: number;
  citas_atendidas: number;
  citas_canceladas: number;
  citas_reprogramadas: number;
  citas_programadas: number;
  ausencias_paciente: number;
  ausencias_medico: number;
  predicciones_total: number;
}

export interface SerieCitasPeriodo {
  periodo: string;
  programada: number;
  en_atencion: number;
  cumplida: number;
  cancelada: number;
  reprogramada: number;
  no_asistio_paciente: number;
  no_asistio_medico: number;
}

export interface SerieRiesgoPeriodo {
  periodo: string;
  bajo: number;
  medio: number;
  alto: number;
  critico: number;
}

export interface SerieConteoPeriodo {
  periodo: string;
  total: number;
}

export interface UsuariosPorRol {
  rol: string;
  total: number;
}

export interface DashboardAnalytics {
  granularidad: AnalyticsGranularidad;
  fecha_desde: string;
  fecha_hasta: string;
  totales: DashboardAnalyticsTotales;
  usuarios_por_rol: UsuariosPorRol[];
  serie_citas: SerieCitasPeriodo[];
  serie_riesgo: SerieRiesgoPeriodo[];
  serie_pacientes_nuevos: SerieConteoPeriodo[];
  riesgo_distribucion: Record<string, number>;
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
  fecha_hora_fin?: string | null;
  duracion_minutos?: number;
  notas?: string | null;
}

export interface CitaUpdate {
  fecha_hora?: string | null;
  fecha_hora_fin?: string | null;
  medico_id?: number | null;
  estado?: 'programada' | 'en_atencion' | 'cumplida' | 'cancelada' | null;
  notas?: string | null;
  duracion_minutos?: number | null;
}

export interface CitaResponse {
  id: number;
  paciente_id: number;
  medico_id: number;
  fecha_hora: string;
  fecha_hora_fin?: string | null;
  duracion_minutos: number;
  estado: 'programada' | 'en_atencion' | 'cumplida' | 'cancelada' | 'reprogramada' | 'no_asistio_paciente' | 'no_asistio_medico';
  notas: string | null;
  cita_anterior_id?: number | null;
  motivo_cierre?: string | null;
  notas_cierre?: string | null;
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

export const getDashboardAnalytics = async (
  fechaDesde: string,
  fechaHasta: string,
  granularidad: AnalyticsGranularidad = 'month',
  medicoId?: number,
): Promise<DashboardAnalytics> => {
  const params: Record<string, string | number> = {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    granularidad,
  };
  if (medicoId) params.medico_id = medicoId;
  const response = await api.get<DashboardAnalytics>('/api/dashboard/analytics', { params });
  return response.data;
};

export interface DashboardOperativoKpis {
  total_pacientes: number;
  total_citas: number;
  realizadas: number;
  programadas: number;
  en_atencion: number;
  canceladas: number;
  reprogramadas: number;
  no_asistio_paciente: number;
  no_asistio_medico: number;
  pendientes: number;
  slots_libres: number;
  slots_ocupados: number;
  nivel_ocupacion: number;
}

export interface DashboardOperativo {
  granularidad: string;
  fecha_desde: string;
  fecha_hasta: string;
  medico_id: number | null;
  kpis: DashboardOperativoKpis;
  serie_citas: SerieCitasPeriodo[];
}

export const getDashboardOperativo = async (
  fechaDesde: string,
  fechaHasta: string,
  granularidad: AnalyticsGranularidad = 'month',
  medicoId?: number,
): Promise<DashboardOperativo> => {
  const params: Record<string, string | number> = {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    granularidad,
  };
  if (medicoId) params.medico_id = medicoId;
  const response = await api.get<DashboardOperativo>('/api/dashboard/operativo', { params });
  return response.data;
};

export const getCitas = async (
  fecha?: string,
  medicoId?: number,
  estado?: string,
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<CitaResponseEnriquecida[]> => {
  const params: Record<string, string | number> = {};
  if (fecha) params.fecha = fecha;
  if (fechaDesde) params.fecha_desde = fechaDesde;
  if (fechaHasta) params.fecha_hasta = fechaHasta;
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

export interface DisponibilidadSlot {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

export interface DisponibilidadResponse {
  medico_id: number;
  fecha: string;
  slots: DisponibilidadSlot[];
  motivo_no_laborable?: string | null;
}

export interface MedicoDisponibilidadResumen {
  medico_id: number;
  nombre: string;
  disponible: boolean;
  motivo?: string | null;
}

export interface DisponibilidadResumenResponse {
  fecha: string;
  hora: string;
  duracion_minutos?: number;
  medicos: MedicoDisponibilidadResumen[];
}

export interface MedicoSlotDisponible {
  medico_id: number;
  nombre: string;
}

export interface SlotSemanal {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  medicos_disponibles: MedicoSlotDisponible[];
}

export interface DiaSemanalDisponibilidad {
  fecha: string;
  dia_semana: number;
  nombre_dia: string;
  es_laborable: boolean;
  motivo_no_laborable?: string | null;
  slots: SlotSemanal[];
}

export interface DisponibilidadSemanaResponse {
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  dias: DiaSemanalDisponibilidad[];
}

export interface HorarioMedico {
  id: number;
  medico_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface HorarioMedicoCreate {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo?: boolean;
}

export interface DiaNoLaborable {
  id: number;
  fecha: string;
  motivo?: string | null;
  alcance: 'clinica' | 'medico';
  medico_id?: number | null;
  created_at: string;
}

export interface DiaNoLaborableCreate {
  fecha: string;
  motivo?: string | null;
  alcance?: 'clinica' | 'medico';
  medico_id?: number | null;
}

export interface CitaPendienteFeriado {
  id: number;
  hora: string;
  paciente_nombre?: string | null;
  medico_nombre?: string | null;
  medico_id: number;
  estado: string;
}

export interface FeriadoValidacionResponse {
  fecha: string;
  puede_feriado: boolean;
  total_citas: number;
  citas: CitaPendienteFeriado[];
}

export interface FeriadoConflictDetail {
  code: 'feriado_con_citas';
  message: string;
  fecha: string;
  total: number;
  citas: CitaPendienteFeriado[];
}

export interface SlotCalendario {
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
  cita_id?: number | null;
  paciente_nombre?: string | null;
  medico_id?: number | null;
  medico_nombre?: string | null;
  estado?: string | null;
  medicos_disponibles?: MedicoSlotDisponible[];
  fuera_horario?: boolean;
}

export interface CitaPendienteHorario {
  cita_id: number;
  fecha_hora: string;
  fecha_hora_fin?: string | null;
  estado: string;
  paciente_nombre?: string | null;
  fuera_horario: boolean;
  motivo: string;
}

export interface HorarioValidacionResponse {
  total_pendientes: number;
  fuera_horario: number;
  citas: CitaPendienteHorario[];
}

export interface DiaCalendario {
  fecha: string;
  dia_semana: number;
  nombre_dia: string;
  es_laborable: boolean;
  motivo_no_laborable?: string | null;
  total_libres: number;
  total_ocupados: number;
  slots: SlotCalendario[];
}

export interface AgendaCalendarioResponse {
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  vista: string;
  dias: DiaCalendario[];
}

export interface CitaEstadisticasResponse {
  total: number;
  realizadas: number;
  programadas: number;
  en_atencion: number;
  canceladas: number;
  reprogramadas: number;
  no_asistio_paciente: number;
  no_asistio_medico: number;
  slots_libres: number;
  slots_ocupados: number;
}

export interface CitaReprogramar {
  fecha_hora: string;
  fecha_hora_fin?: string;
  medico_id?: number;
  duracion_minutos?: number;
  notas?: string | null;
  motivo?: string | null;
}

export const getDisponibilidad = async (
  medicoId: number,
  fecha: string,
  duracionMinutos = 30,
): Promise<DisponibilidadResponse> => {
  const response = await api.get<DisponibilidadResponse>('/api/citas/disponibilidad', {
    params: { medico_id: medicoId, fecha, duracion_minutos: duracionMinutos },
  });
  return response.data;
};

export const getDisponibilidadSemana = async (
  fecha: string,
  duracionMinutos = 30,
): Promise<DisponibilidadSemanaResponse> => {
  const response = await api.get<DisponibilidadSemanaResponse>('/api/citas/disponibilidad/semana', {
    params: { fecha, duracion_minutos: duracionMinutos },
  });
  return response.data;
};

export const getDisponibilidadResumen = async (
  fecha: string,
  hora: string,
  duracionMinutos = 30,
): Promise<DisponibilidadResumenResponse> => {
  const response = await api.get<DisponibilidadResumenResponse>('/api/citas/disponibilidad/resumen', {
    params: { fecha, hora, duracion_minutos: duracionMinutos },
  });
  return response.data;
};

export const validarHorarioCita = async (
  medicoId: number,
  fecha: string,
  hora: string,
  duracionMinutos = 30,
  excluirCitaId?: number,
): Promise<{ disponible: boolean; motivo?: string | null }> => {
  const params: Record<string, string | number> = {
    medico_id: medicoId,
    fecha,
    hora,
    duracion_minutos: duracionMinutos,
  };
  if (excluirCitaId) params.excluir_cita_id = excluirCitaId;
  const response = await api.get<{ disponible: boolean; motivo?: string | null }>(
    '/api/citas/validar-horario',
    { params },
  );
  return response.data;
};

export const getHorariosMedico = async (medicoId: number): Promise<HorarioMedico[]> => {
  const response = await api.get<HorarioMedico[]>(`/api/agenda/horarios-medico/${medicoId}`);
  return response.data;
};

export const setHorariosMedicoBulk = async (
  medicoId: number,
  bloques: HorarioMedicoCreate[],
): Promise<HorarioMedico[]> => {
  const response = await api.put<HorarioMedico[]>(`/api/agenda/horarios-medico/${medicoId}/bulk`, {
    bloques,
  });
  return response.data;
};

export const getCitasPendientesHorarioMedico = async (
  medicoId: number,
): Promise<HorarioValidacionResponse> => {
  const response = await api.get<HorarioValidacionResponse>(
    `/api/agenda/horarios-medico/${medicoId}/citas-pendientes`,
  );
  return response.data;
};

export const validarBloquesHorarioMedico = async (
  medicoId: number,
  bloques: HorarioMedicoCreate[],
): Promise<HorarioValidacionResponse> => {
  const response = await api.post<HorarioValidacionResponse>(
    `/api/agenda/horarios-medico/${medicoId}/validar-bloques`,
    { bloques },
  );
  return response.data;
};

export const getDiasNoLaborables = async (desde?: string, hasta?: string): Promise<DiaNoLaborable[]> => {
  const params: Record<string, string> = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const response = await api.get<DiaNoLaborable[]>('/api/agenda/dias-no-laborables', { params });
  return response.data;
};

export const validarFeriadoFecha = async (
  fecha: string,
  alcance: 'clinica' | 'medico' = 'clinica',
  medicoId?: number,
): Promise<FeriadoValidacionResponse> => {
  const params: Record<string, string | number> = { fecha, alcance };
  if (medicoId) params.medico_id = medicoId;
  const response = await api.get<FeriadoValidacionResponse>(
    '/api/agenda/dias-no-laborables/validar',
    { params },
  );
  return response.data;
};

export const createDiaNoLaborable = async (data: DiaNoLaborableCreate): Promise<DiaNoLaborable> => {
  const response = await api.post<DiaNoLaborable>('/api/agenda/dias-no-laborables', data);
  return response.data;
};

export const deleteDiaNoLaborable = async (id: number): Promise<void> => {
  await api.delete(`/api/agenda/dias-no-laborables/${id}`);
};

export const getAgendaCalendario = async (
  fechaDesde: string,
  fechaHasta: string,
  duracionMinutos = 30,
  medicoId?: number,
  filtroSlots = 'todos',
  vista = 'semana',
): Promise<AgendaCalendarioResponse> => {
  const params: Record<string, string | number> = {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    duracion_minutos: duracionMinutos,
    filtro_slots: filtroSlots,
    vista,
  };
  if (medicoId) params.medico_id = medicoId;
  const response = await api.get<AgendaCalendarioResponse>('/api/citas/agenda-calendario', { params });
  return response.data;
};

export const getCitaEstadisticas = async (
  fechaDesde: string,
  fechaHasta: string,
  medicoId?: number,
  duracionMinutos = 30,
): Promise<CitaEstadisticasResponse> => {
  const params: Record<string, string | number> = {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    duracion_minutos: duracionMinutos,
  };
  if (medicoId) params.medico_id = medicoId;
  const response = await api.get<CitaEstadisticasResponse>('/api/citas/estadisticas', { params });
  return response.data;
};

export const reprogramarCita = async (id: number, data: CitaReprogramar): Promise<CitaResponseEnriquecida> => {
  const response = await api.post<CitaResponseEnriquecida>(`/api/citas/${id}/reprogramar`, data);
  return response.data;
};

export const marcarAusenciaCita = async (
  id: number,
  data: { tipo: 'paciente' | 'medico'; motivo?: string; notas?: string },
): Promise<CitaResponse> => {
  const response = await api.post<CitaResponse>(`/api/citas/${id}/ausencia`, data);
  return response.data;
};

export const cancelarCitaConMotivo = async (id: number, motivo?: string): Promise<CitaResponse> => {
  const response = await api.delete<CitaResponse>(`/api/citas/${id}`, { params: motivo ? { motivo } : {} });
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

export const deletePaciente = async (id: number): Promise<{ paciente: PacienteResponse; citas_canceladas: number }> => {
  const response = await api.delete<{ paciente: PacienteResponse; citas_canceladas: number }>(`/api/pacientes/${id}`);
  return response.data;
};

export const getCitasFuturasPaciente = async (id: number): Promise<number> => {
  const response = await api.get<{ total: number }>(`/api/pacientes/${id}/citas-futuras`);
  return response.data.total;
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
  embarazo_multiple?: number | null;
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

export const getUltimaPrediccion = async (pacienteId: number): Promise<PrediccionUltimaResponse> => {
  const response = await api.get<PrediccionUltimaResponse>(`/api/prediccion/paciente/${pacienteId}/ultima`);
  return response.data;
};

// ==================== DATOS CLÍNICOS ====================

export interface DatosClinicosResponse {
  id: number;
  paciente_id: number;
  edad_gestacional_semanas: number | null;
  longitud_cervical_mm: number | null;
  embarazo_multiple: number;
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

export interface AnalizarResponse {
  datos_clinicos: DatosClinicosResponse;
  prediccion: {
    prediccion_id: number;
    prob_consenso: number;
    nivel_riesgo: string;
    modelos: ModelosConsenso;
  };
}

export const createAndAnalizarDatosClinicos = async (pacienteId: number, data: DatosClinicosInput): Promise<AnalizarResponse> => {
  const response = await api.post<AnalizarResponse>(`/api/datos-clinicos/${pacienteId}/analizar`, data);
  return response.data;
};

export const updateAndAnalizarDatosClinicos = async (pacienteId: number, data: DatosClinicosInput): Promise<AnalizarResponse> => {
  const response = await api.put<AnalizarResponse>(`/api/datos-clinicos/${pacienteId}/analizar`, data);
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

// ==================== USUARIOS (ADMIN) ====================

export interface RolResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface UsuarioResponse {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: RolResponse;
  activo: boolean;
  created_at: string;
}

export interface UsuarioCreatePayload {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  rol_id: number;
}

export interface UsuarioUpdatePayload {
  username?: string;
  email?: string;
  nombre?: string;
  apellidos?: string;
  activo?: boolean;
}

export const getRoles = async (): Promise<RolResponse[]> => {
  const response = await api.get<RolResponse[]>('/api/usuarios/roles');
  return response.data;
};

export const getUsuarios = async (): Promise<UsuarioResponse[]> => {
  const response = await api.get<UsuarioResponse[]>('/api/usuarios/');
  return response.data;
};

export const createUsuario = async (data: UsuarioCreatePayload): Promise<UsuarioResponse> => {
  const response = await api.post<UsuarioResponse>('/api/usuarios/', data);
  return response.data;
};

export const updateUsuario = async (id: number, data: UsuarioUpdatePayload): Promise<UsuarioResponse> => {
  const response = await api.put<UsuarioResponse>(`/api/usuarios/${id}`, data);
  return response.data;
};

export const desactivarUsuario = async (id: number): Promise<{ usuario: UsuarioResponse; citas_canceladas: number }> => {
  const response = await api.delete<{ usuario: UsuarioResponse; citas_canceladas: number }>(`/api/usuarios/${id}`);
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

// ==================== PREDICCIÓN FEEDBACK ====================

export interface PrediccionFeedbackResponse {
  id: number;
  prediccion_id: number;
  medico_id: number;
  modelo: string | null;
  aspecto: string;
  voto_correcta: boolean;
  comentario: string | null;
  created_at: string;
}

export interface PrediccionFeedbackInput {
  voto_correcta: boolean;
  comentario?: string;
  modelo?: string;
  aspecto?: 'probabilidad' | 'semanas';
}

export const getPrediccionFeedback = async (
  prediccionId: number,
  modelo?: string,
  aspecto: 'probabilidad' | 'semanas' = 'probabilidad',
): Promise<PrediccionFeedbackResponse | null> => {
  try {
    const params: Record<string, string> = { aspecto };
    if (modelo) params.modelo = modelo;
    const response = await api.get<PrediccionFeedbackResponse>(`/api/prediccion/${prediccionId}/feedback`, { params });
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const getPrediccionesFeedback = async (prediccionId: number): Promise<PrediccionFeedbackResponse[]> => {
  const response = await api.get<PrediccionFeedbackResponse[]>(`/api/prediccion/${prediccionId}/feedback/todos`);
  return response.data;
};

export const guardarPrediccionFeedback = async (
  prediccionId: number,
  data: PrediccionFeedbackInput,
): Promise<PrediccionFeedbackResponse> => {
  const response = await api.post<PrediccionFeedbackResponse>(`/api/prediccion/${prediccionId}/feedback`, data);
  return response.data;
};

// ==================== FEEDBACK ESTADÍSTICAS ====================

export interface FeedbackPorModelo {
  modelo: string | null;
  total: number;
  correctos: number;
  incorrectos: number;
  precision: number;
}

export interface FeedbackTemporal {
  fecha: string;
  total: number;
  correctos: number;
  incorrectos: number;
  precision: number;
}

export interface FeedbackPorAspecto {
  aspecto: string;
  total: number;
  correctos: number;
  incorrectos: number;
  precision: number;
}

export interface FeedbackEstadisticasResponse {
  total_votos: number;
  total_correctos: number;
  total_incorrectos: number;
  precision_global: number;
  por_modelo: FeedbackPorModelo[];
  por_aspecto: FeedbackPorAspecto[];
  temporal: FeedbackTemporal[];
  alcance: string;
  medico_id: number | null;
}

export const getFeedbackEstadisticas = async (params?: {
  alcance?: 'global' | 'propio';
  medicoId?: number;
  aspecto?: 'probabilidad' | 'semanas';
}): Promise<FeedbackEstadisticasResponse> => {
  const query: Record<string, string | number> = {};
  if (params?.alcance) query.alcance = params.alcance;
  if (params?.medicoId) query.medico_id = params.medicoId;
  if (params?.aspecto) query.aspecto = params.aspecto;
  const response = await api.get<FeedbackEstadisticasResponse>('/api/prediccion/feedback/estadisticas', { params: query });
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

export interface RecomendacionListItem {
  id: number;
  paciente_id: number;
  paciente_nombre: string;
  semanas_gestacion: number | null;
  titulo: string;
  tipo: string | null;
  prioridad: 'alta' | 'media' | 'baja' | null;
  estado: string;
  fecha: string;
  medico_nombre: string | null;
}

export interface RecomendacionListResponse {
  items: RecomendacionListItem[];
  total: number;
  page: number;
  pages: number;
}

export interface RecomendacionUpdatePayload {
  estado?: 'activo' | 'pendiente' | 'completado' | 'cancelada';
  prioridad?: 'alta' | 'media' | 'baja';
  notas?: string;
  fecha_revision?: string;
}

export interface RecomendacionesQueryParams {
  tipo?: string;
  prioridad?: string;
  estado?: string;
  medico_id?: number;
  fecha?: string;
  page?: number;
  limit?: number;
}

export const getRecomendaciones = async (
  params: RecomendacionesQueryParams = {},
): Promise<RecomendacionListResponse> => {
  const response = await api.get<RecomendacionListResponse>('/api/recomendaciones', { params });
  return response.data;
};

export const updateRecomendacion = async (
  id: number,
  data: RecomendacionUpdatePayload,
): Promise<RecomendacionResponse> => {
  const response = await api.put<RecomendacionResponse>(`/api/recomendaciones/${id}`, data);
  return response.data;
};

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

// ==================== REPORTES ====================

export type TipoReporte = 'completo' | 'prediccion' | 'triaje';

export interface EnviarReporteResponse {
  enviado: boolean;
  email: string;
  tipo: string;
  mensaje: string;
}

export const exportarReportePaciente = async (
  pacienteId: number,
  format: 'pdf' | 'xlsx' = 'pdf',
  tipo: TipoReporte = 'completo',
): Promise<Blob> => {
  const response = await api.get(`/api/reportes/paciente/${pacienteId}/export`, {
    params: { format, tipo },
    responseType: 'blob',
  });
  return response.data;
};

export const enviarReportePaciente = async (
  pacienteId: number,
  tipo: TipoReporte = 'prediccion',
): Promise<EnviarReporteResponse> => {
  const response = await api.post<EnviarReporteResponse>(
    `/api/reportes/paciente/${pacienteId}/enviar`,
    null,
    { params: { tipo } },
  );
  return response.data;
};

export const ejecutarRecomendacionesS4 = async (pacienteId: number, prediccionId: number): Promise<void> => {
  await api.post(`/api/recomendaciones/ejecutar/${pacienteId}/${prediccionId}`);
};
