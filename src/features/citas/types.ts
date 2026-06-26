export interface PacientePerfilResponse {
  id: number;
  dni: string;
  nombre: string;
  apellidos: string;
  telefono_principal: string | null;
  email: string | null;
  edad_madre: number | null;
  edad_gestacional_semanas: number | null;
  longitud_cervical_mm: number | null;
  embarazo_multiple: number | null;
  parto_prematuro_previo: boolean | null;
  hipertension_gestacional: boolean | null;
  bmi: number | null;
  num_condiciones_cronicas: number | null;
  infeccion_activa: boolean | null;
  prob_consenso: number | null;
  nivel_riesgo: string | null;
  semanas_estimadas_consenso: number | null;
  nivel_urgencia: string | null;
  medico_nombre: string | null;
  fecha_ultima_prediccion: string | null;
  fecha_ultimo_triage: string | null;
}
