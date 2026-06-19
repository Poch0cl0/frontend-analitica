import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useNav } from '../../contexts/NavContext';
import {
  getPacienteById,
  updatePaciente,
  getMedicos,
  getCitas,
  createCita,
  updateCita,
  deleteCita,
  changeCitaEstado,
  getDatosClinicos,
  createDatosClinicos,
  updateDatosClinicos,
} from '../../services/api';
import type {
  PacienteResponse,
  MedicoResumen,
  CitaResponseEnriquecida,
  PacienteUpdatePayload,
  CitaCreate,
  CitaUpdate,
  DatosClinicosResponse,
  DatosClinicosInput,
} from '../../services/api';

const PRIMARY = '#612853';

function calcEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatHour(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return '--:--'; }
}

function getStatusBadge(estado: string) {
  switch (estado) {
    case 'programada':  return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'en_atencion': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'cumplida':    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelada':   return 'bg-red-50 text-red-700 border-red-200';
    default:            return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

function getStatusLabel(estado: string) {
  const map: Record<string, string> = {
    programada: 'Programada', en_atencion: 'En Atención',
    cumplida: 'Cumplida', cancelada: 'Cancelada',
  };
  return map[estado] || estado;
}

const TIPO_CITA_OPTIONS = [
  { value: 'Control Prenatal', label: 'Control Prenatal de Rutina' },
  { value: 'Consulta Inicial', label: 'Consulta Inicial / Primera Cita' },
  { value: 'Ecografía Obstétrica', label: 'Ecografía Obstétrica' },
  { value: 'Monitoreo Fetal', label: 'Monitoreo Fetal' },
  { value: 'Urgencia Prenatal', label: 'Control Urgente por Riesgo' },
  { value: 'Consulta Especialidad', label: 'Evaluación de Especialidad (Alto Riesgo)' },
];

const BMI_CATEGORIAS = [
  { value: '', label: '— Sin calcular —' },
  { value: 'bajo_peso', label: 'Bajo Peso (<18.5)' },
  { value: 'normal', label: 'Normal (18.5–24.9)' },
  { value: 'sobrepeso', label: 'Sobrepeso (25–29.9)' },
  { value: 'obesidad_I', label: 'Obesidad I (30–34.9)' },
  { value: 'obesidad_II', label: 'Obesidad II (35–39.9)' },
  { value: 'obesidad_III', label: 'Obesidad III (≥40)' },
];

// ── Datos Clínicos form state ─────────────────────────────────────────────────
interface DcForm {
  edad_gestacional_semanas: string;
  longitud_cervical_mm: string;
  embarazo_multiple: boolean;
  parto_prematuro_previo: boolean;
  hipertension_gestacional: boolean;
  bmi: string;
  bmi_categoria: string;
  num_condiciones_cronicas: string;
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
  num_cesareas: string;
  num_partos_previos_vivos: string;
  alerta_activa: boolean;
  notas_medicas: string;
}

const emptyDcForm: DcForm = {
  edad_gestacional_semanas: '', longitud_cervical_mm: '',
  embarazo_multiple: false, parto_prematuro_previo: false,
  hipertension_gestacional: false, bmi: '', bmi_categoria: '',
  num_condiciones_cronicas: '0', infeccion_activa: false,
  diabetes_pregestacional: false, diabetes_gestacional: false,
  hipertension_cronica: false, eclampsia: false,
  hepatitis_b: false, hepatitis_c: false, sifilis: false,
  clamidia: false, gonorrea: false, cesareas_previas: false,
  num_cesareas: '0', num_partos_previos_vivos: '0',
  alerta_activa: false, notas_medicas: '',
};

function dcFromResponse(dc: DatosClinicosResponse): DcForm {
  return {
    edad_gestacional_semanas: dc.edad_gestacional_semanas !== null ? String(dc.edad_gestacional_semanas) : '',
    longitud_cervical_mm: dc.longitud_cervical_mm !== null ? String(dc.longitud_cervical_mm) : '',
    embarazo_multiple: dc.embarazo_multiple,
    parto_prematuro_previo: dc.parto_prematuro_previo,
    hipertension_gestacional: dc.hipertension_gestacional,
    bmi: dc.bmi !== null ? String(dc.bmi) : '',
    bmi_categoria: dc.bmi_categoria || '',
    num_condiciones_cronicas: String(dc.num_condiciones_cronicas),
    infeccion_activa: dc.infeccion_activa,
    diabetes_pregestacional: dc.diabetes_pregestacional,
    diabetes_gestacional: dc.diabetes_gestacional,
    hipertension_cronica: dc.hipertension_cronica,
    eclampsia: dc.eclampsia,
    hepatitis_b: dc.hepatitis_b,
    hepatitis_c: dc.hepatitis_c,
    sifilis: dc.sifilis,
    clamidia: dc.clamidia,
    gonorrea: dc.gonorrea,
    cesareas_previas: dc.cesareas_previas,
    num_cesareas: String(dc.num_cesareas),
    num_partos_previos_vivos: String(dc.num_partos_previos_vivos),
    alerta_activa: dc.alerta_activa,
    notas_medicas: dc.notas_medicas || '',
  };
}

function dcToPayload(form: DcForm): DatosClinicosInput {
  return {
    edad_gestacional_semanas: form.edad_gestacional_semanas ? Number(form.edad_gestacional_semanas) : null,
    longitud_cervical_mm: form.longitud_cervical_mm ? Number(form.longitud_cervical_mm) : null,
    embarazo_multiple: form.embarazo_multiple,
    parto_prematuro_previo: form.parto_prematuro_previo,
    hipertension_gestacional: form.hipertension_gestacional,
    bmi: form.bmi ? Number(form.bmi) : null,
    bmi_categoria: form.bmi_categoria || null,
    num_condiciones_cronicas: Number(form.num_condiciones_cronicas) || 0,
    infeccion_activa: form.infeccion_activa,
    diabetes_pregestacional: form.diabetes_pregestacional,
    diabetes_gestacional: form.diabetes_gestacional,
    hipertension_cronica: form.hipertension_cronica,
    eclampsia: form.eclampsia,
    hepatitis_b: form.hepatitis_b,
    hepatitis_c: form.hepatitis_c,
    sifilis: form.sifilis,
    clamidia: form.clamidia,
    gonorrea: form.gonorrea,
    cesareas_previas: form.cesareas_previas,
    num_cesareas: Number(form.num_cesareas) || 0,
    num_partos_previos_vivos: Number(form.num_partos_previos_vivos) || 0,
    alerta_activa: form.alerta_activa,
    notas_medicas: form.notas_medicas || null,
  };
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${checked ? '' : 'bg-gray-200'}`}
      style={checked ? { backgroundColor: PRIMARY } : {}}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

// ── Datos Clínicos Form (inline dentro del tab o modal atender) ───────────────
interface DcFormViewProps {
  form: DcForm;
  onChange: (key: keyof DcForm, value: string | boolean) => void;
}

function DcFormView({ form, onChange }: DcFormViewProps) {
  const inputCls = "w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white";
  const borderNormal = '#E8D5EF';

  const ToggleRow = ({ label, field }: { label: string; field: keyof DcForm }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <Toggle checked={form[field] as boolean} onChange={v => onChange(field, v)} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Datos del embarazo */}
      <div>
        <div className="flex items-center gap-2 mb-4 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
          <span className="text-sm font-bold text-gray-800">Datos del Embarazo</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Semanas de gestación</label>
            <input type="number" min="20" max="45" value={form.edad_gestacional_semanas}
              onChange={e => onChange('edad_gestacional_semanas', e.target.value)}
              placeholder="20–45"
              className={inputCls} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Longitud cervical (mm)</label>
            <input type="number" min="0" step="0.1" value={form.longitud_cervical_mm}
              onChange={e => onChange('longitud_cervical_mm', e.target.value)}
              placeholder="Ej. 25.5"
              className={inputCls} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">IMC (BMI)</label>
            <input type="number" min="10" max="60" step="0.1" value={form.bmi}
              onChange={e => onChange('bmi', e.target.value)}
              placeholder="Ej. 24.5"
              className={inputCls} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría IMC</label>
            <select value={form.bmi_categoria} onChange={e => onChange('bmi_categoria', e.target.value)}
              className={`${inputCls}`} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}>
              {BMI_CATEGORIAS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-0.5">
          <ToggleRow label="Embarazo múltiple (gemelos, etc.)" field="embarazo_multiple" />
          <ToggleRow label="Parto prematuro previo" field="parto_prematuro_previo" />
        </div>
      </div>

      {/* Condiciones maternas */}
      <div>
        <div className="flex items-center gap-2 mb-3 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
          <span className="text-sm font-bold text-gray-800">Condiciones Maternas</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
          <ToggleRow label="Hipertensión gestacional" field="hipertension_gestacional" />
          <ToggleRow label="Hipertensión crónica" field="hipertension_cronica" />
          <ToggleRow label="Diabetes pregestacional" field="diabetes_pregestacional" />
          <ToggleRow label="Diabetes gestacional" field="diabetes_gestacional" />
          <ToggleRow label="Eclampsia" field="eclampsia" />
          <ToggleRow label="Infección activa" field="infeccion_activa" />
          <ToggleRow label="Alerta activa" field="alerta_activa" />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">N° condiciones crónicas</label>
          <input type="number" min="0" max="20" value={form.num_condiciones_cronicas}
            onChange={e => onChange('num_condiciones_cronicas', e.target.value)}
            className={inputCls} style={{ borderColor: borderNormal }}
            onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
            onBlur={e => e.currentTarget.style.borderColor = borderNormal}
          />
        </div>
      </div>

      {/* Infecciones de transmisión */}
      <div>
        <div className="flex items-center gap-2 mb-3 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
          <span className="text-sm font-bold text-gray-800">Infecciones de Transmisión Sexual</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
          <ToggleRow label="Hepatitis B" field="hepatitis_b" />
          <ToggleRow label="Hepatitis C" field="hepatitis_c" />
          <ToggleRow label="Sífilis" field="sifilis" />
          <ToggleRow label="Clamidia" field="clamidia" />
          <ToggleRow label="Gonorrea" field="gonorrea" />
        </div>
      </div>

      {/* Historial obstétrico */}
      <div>
        <div className="flex items-center gap-2 mb-3 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
          <span className="text-sm font-bold text-gray-800">Historial Obstétrico</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <ToggleRow label="Cesáreas previas" field="cesareas_previas" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">N° de cesáreas</label>
            <input type="number" min="0" max="10" value={form.num_cesareas}
              onChange={e => onChange('num_cesareas', e.target.value)}
              className={inputCls} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">N° partos previos vivos</label>
            <input type="number" min="0" max="20" value={form.num_partos_previos_vivos}
              onChange={e => onChange('num_partos_previos_vivos', e.target.value)}
              className={inputCls} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}
            />
          </div>
        </div>
      </div>

      {/* Notas médicas */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Notas Médicas</label>
        <textarea rows={3} value={form.notas_medicas}
          onChange={e => onChange('notas_medicas', e.target.value)}
          placeholder="Observaciones clínicas, seguimiento especial..."
          className={`${inputCls} resize-none`} style={{ borderColor: borderNormal }}
          onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
          onBlur={e => e.currentTarget.style.borderColor = borderNormal}
        />
      </div>
    </div>
  );
}

// ── CITA MODAL (solo secretaria) ──────────────────────────────────────────────
interface CitaFormData {
  fecha: string; hora: string; medico_id: string;
  motivo: string; duracion_minutos: number; notas: string;
}

interface CitaModalProps {
  mode: 'create' | 'edit';
  form: CitaFormData;
  pacienteNombre: string;
  medicos: MedicoResumen[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onDuracionChange: (v: number) => void;
}

function CitaModal({ mode, form, pacienteNombre, medicos, isSaving, onClose, onSubmit, onChange, onDuracionChange }: CitaModalProps) {
  const inputCls = "w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white";
  const borderStyle = { borderColor: '#E8D5EF' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
         onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
              <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {mode === 'create' ? 'Nueva Cita Médica' : 'Editar Cita Médica'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
            <span className="text-sm font-bold text-gray-800">Datos de la Cita</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Paciente</label>
            <input readOnly value={pacienteNombre} className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} style={borderStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Obstetra Médico *</label>
            <select name="medico_id" required value={form.medico_id} onChange={onChange}
              className={inputCls} style={borderStyle}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}>
              <option value="">Seleccionar médico</option>
              {medicos.map(m => <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha *</label>
              <input type="date" name="fecha" required value={form.fecha} onChange={onChange}
                className={inputCls} style={borderStyle}
                onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Hora *</label>
              <input type="time" name="hora" required value={form.hora} onChange={onChange}
                className={inputCls} style={borderStyle}
                onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de Cita *</label>
            <select name="motivo" value={form.motivo} onChange={onChange}
              className={inputCls} style={borderStyle}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}>
              {TIPO_CITA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-500">Duración de la consulta</label>
              <span className="text-xs font-bold" style={{ color: PRIMARY }}>{form.duracion_minutos} min</span>
            </div>
            <input type="range" min="15" max="120" step="15" value={form.duracion_minutos}
              onChange={e => onDuracionChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: PRIMARY }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notas o Comentarios</label>
            <textarea name="notas" rows={3} value={form.notas} onChange={onChange as any}
              placeholder="Síntomas iniciales, antecedentes..."
              className={`${inputCls} resize-none`} style={borderStyle}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50"
              style={{ borderColor: '#E8D5EF' }}>Cancelar</button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: PRIMARY }}>
              {isSaving ? 'Guardando...' : mode === 'create' ? 'Agendar Cita' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
type TabType = 'personal' | 'clinico' | 'citas';

export default function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setNav } = useNav();

  const userRole = localStorage.getItem('user_role') || '';
  const isDoctor = userRole === 'medico';
  const isSecretary = userRole === 'secretaria';

  const initialTab = (location.state as any)?.initialTab || 'personal';

  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [citas, setCitas] = useState<CitaResponseEnriquecida[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Datos clínicos (solo médico/admin)
  const [datosClinicos, setDatosClinicos] = useState<DatosClinicosResponse | null>(null);
  const [dcExists, setDcExists] = useState(false);
  const [dcForm, setDcForm] = useState<DcForm>(emptyDcForm);
  const [isSavingDc, setIsSavingDc] = useState(false);

  // Edit patient modal (secretaria)
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '', apellidos: '', dni: '', fecha_nacimiento: '',
    telefono_principal: '', email: '',
  });
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Cita modals (secretaria)
  const [citaModal, setCitaModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedCita, setSelectedCita] = useState<CitaResponseEnriquecida | null>(null);
  const [isSavingCita, setIsSavingCita] = useState(false);
  const [citaForm, setCitaForm] = useState<CitaFormData>({
    fecha: '', hora: '', medico_id: '', motivo: 'Control Prenatal', duracion_minutos: 30, notas: '',
  });

  // Atender cita modal (médico)
  const [atenderCita, setAtenderCita] = useState<CitaResponseEnriquecida | null>(null);
  const [atenderDcForm, setAtenderDcForm] = useState<DcForm>(emptyDcForm);
  const [isSavingAtender, setIsSavingAtender] = useState(false);

  const medicoMap: Record<number, MedicoResumen> = {};
  medicos.forEach(m => { medicoMap[m.id] = m; });

  // ── LOAD ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [pac, med] = await Promise.all([
          getPacienteById(Number(id)),
          getMedicos(),
        ]);
        setPaciente(pac);
        setMedicos(med);
        setNav('Pacientes', [
          { label: 'Principal' },
          { label: 'Pacientes', path: '/pacientes' },
          { label: `${pac.nombre} ${pac.apellidos}` },
        ]);

        const allCitas = await getCitas();
        setCitas(allCitas.filter(c => c.paciente_id === pac.id));

        // Cargar datos clínicos para médico/admin
        if (!isSecretary) {
          try {
            const dc = await getDatosClinicos(Number(id));
            setDatosClinicos(dc);
            setDcExists(true);
            setDcForm(dcFromResponse(dc));
          } catch (err: any) {
            if (err?.response?.status === 404) {
              setDcExists(false);
              setDcForm(emptyDcForm);
            }
          }
        }
      } catch {
        showToast('Error al cargar los datos de la paciente', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    return () => { setNav(null); };
  }, [id, isSecretary]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const reloadCitas = async () => {
    if (!paciente) return;
    const all = await getCitas();
    setCitas(all.filter(c => c.paciente_id === paciente.id));
  };

  // ── DATOS CLÍNICOS (médico) ────────────────────────────────────────────────
  const handleSaveDc = async (e: FormEvent) => {
    e.preventDefault();
    if (!paciente) return;
    setIsSavingDc(true);
    try {
      const payload = dcToPayload(dcForm);
      let saved: DatosClinicosResponse;
      if (dcExists) {
        saved = await updateDatosClinicos(paciente.id, payload);
      } else {
        saved = await createDatosClinicos(paciente.id, payload);
        setDcExists(true);
      }
      setDatosClinicos(saved);
      setDcForm(dcFromResponse(saved));
      showToast('Datos clínicos guardados correctamente', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al guardar datos clínicos', 'error');
    } finally {
      setIsSavingDc(false);
    }
  };

  // ── ATENDER CITA (médico) ─────────────────────────────────────────────────
  const handleOpenAtender = (cita: CitaResponseEnriquecida) => {
    setAtenderCita(cita);
    setAtenderDcForm(datosClinicos ? dcFromResponse(datosClinicos) : emptyDcForm);
  };

  const handleAtender = async (e: FormEvent) => {
    e.preventDefault();
    if (!atenderCita || !paciente) return;
    setIsSavingAtender(true);
    try {
      const payload = dcToPayload(atenderDcForm);
      if (dcExists) {
        const saved = await updateDatosClinicos(paciente.id, payload);
        setDatosClinicos(saved);
        setDcForm(dcFromResponse(saved));
      } else {
        const saved = await createDatosClinicos(paciente.id, payload);
        setDatosClinicos(saved);
        setDcExists(true);
        setDcForm(dcFromResponse(saved));
      }
      await changeCitaEstado(atenderCita.id, 'cumplida');
      showToast('Cita marcada como atendida y datos clínicos guardados', 'success');
      setAtenderCita(null);
      await reloadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al atender la cita', 'error');
    } finally {
      setIsSavingAtender(false);
    }
  };

  // ── EDIT PATIENT (secretaria) ──────────────────────────────────────────────
  const handleOpenEditPatient = () => {
    if (!paciente) return;
    setEditForm({
      nombre: paciente.nombre,
      apellidos: paciente.apellidos,
      dni: paciente.dni,
      fecha_nacimiento: paciente.fecha_nacimiento.split('T')[0],
      telefono_principal: paciente.telefono_principal || '',
      email: paciente.email || '',
    });
    setShowEditPatient(true);
  };

  const handleSavePatient = async (e: FormEvent) => {
    e.preventDefault();
    if (!paciente) return;
    setIsSavingPatient(true);
    try {
      const payload: PacienteUpdatePayload = {
        nombre: editForm.nombre,
        apellidos: editForm.apellidos,
        fecha_nacimiento: editForm.fecha_nacimiento,
        telefono_principal: editForm.telefono_principal || null,
        email: editForm.email || null,
      };
      const updated = await updatePaciente(paciente.id, payload);
      setPaciente(updated);
      setNav('Pacientes', [
        { label: 'Principal' },
        { label: 'Pacientes', path: '/pacientes' },
        { label: `${updated.nombre} ${updated.apellidos}` },
      ]);
      showToast('Datos actualizados correctamente', 'success');
      setShowEditPatient(false);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al actualizar', 'error');
    } finally {
      setIsSavingPatient(false);
    }
  };

  // ── CITA CRUD (secretaria) ─────────────────────────────────────────────────
  const handleOpenCreateCita = () => {
    const now = new Date();
    setCitaForm({
      fecha: now.toISOString().split('T')[0],
      hora: `${String(now.getHours() + 1).padStart(2, '0')}:00`,
      medico_id: '', motivo: 'Control Prenatal', duracion_minutos: 30, notas: '',
    });
    setCitaModal('create');
  };

  const handleCreateCita = async (e: FormEvent) => {
    e.preventDefault();
    if (!paciente) return;
    setIsSavingCita(true);
    try {
      const payload: CitaCreate = {
        paciente_id: paciente.id,
        medico_id: Number(citaForm.medico_id),
        fecha_hora: `${citaForm.fecha}T${citaForm.hora}:00`,
        duracion_minutos: citaForm.duracion_minutos,
        motivo: citaForm.motivo,
        notas: citaForm.notas || null,
      };
      await createCita(payload);
      // Recargar paciente para obtener medico_asignado_id actualizado
      const updatedPac = await getPacienteById(paciente.id);
      setPaciente(updatedPac);
      showToast('Cita agendada exitosamente', 'success');
      setCitaModal(null);
      await reloadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al agendar la cita', 'error');
    } finally {
      setIsSavingCita(false);
    }
  };

  const handleOpenEditCita = (cita: CitaResponseEnriquecida) => {
    setSelectedCita(cita);
    const dt = new Date(cita.fecha_hora);
    setCitaForm({
      fecha: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
      hora: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
      medico_id: String(cita.medico_id),
      motivo: cita.motivo || 'Control Prenatal',
      duracion_minutos: cita.duracion_minutos,
      notas: cita.notas || '',
    });
    setCitaModal('edit');
  };

  const handleEditCita = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCita) return;
    setIsSavingCita(true);
    try {
      const payload: CitaUpdate = {
        fecha_hora: `${citaForm.fecha}T${citaForm.hora}:00`,
        medico_id: Number(citaForm.medico_id),
        motivo: citaForm.motivo,
        duracion_minutos: citaForm.duracion_minutos,
        notas: citaForm.notas || null,
      };
      await updateCita(selectedCita.id, payload);
      showToast('Cita actualizada correctamente', 'success');
      setCitaModal(null);
      await reloadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al actualizar la cita', 'error');
    } finally {
      setIsSavingCita(false);
    }
  };

  const handleDeleteCita = async () => {
    if (!selectedCita) return;
    setIsSavingCita(true);
    try {
      await deleteCita(selectedCita.id);
      showToast('Cita cancelada exitosamente', 'success');
      setCitaModal(null);
      await reloadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al cancelar la cita', 'error');
    } finally {
      setIsSavingCita(false);
    }
  };

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-4 animate-spin" style={{ borderTopColor: PRIMARY }} />
        <p className="text-sm text-gray-400 font-medium">Cargando expediente clínico...</p>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen gap-4">
        <p className="text-gray-500 font-medium">Paciente no encontrada.</p>
        <Link to="/pacientes" className="text-sm font-bold text-white py-2 px-5 rounded-xl hover:opacity-90" style={{ backgroundColor: PRIMARY }}>
          Volver a Pacientes
        </Link>
      </div>
    );
  }

  const edad = calcEdad(paciente.fecha_nacimiento);
  const medicoAsignado = paciente.medico_asignado_id ? medicoMap[paciente.medico_asignado_id] : null;
  const citasActivas = citas.filter(c => c.estado === 'programada' || c.estado === 'en_atencion');
  const citasPendientes = citas.filter(c => c.estado === 'programada' || c.estado === 'en_atencion');

  // Tabs disponibles según rol
  const tabs: { key: TabType; label: string }[] = isDoctor
    ? [
        { key: 'personal', label: 'Datos Personales' },
        { key: 'clinico', label: dcExists ? 'Datos Clínicos ✓' : 'Datos Clínicos' },
        { key: 'citas', label: `Citas (${citas.length})` },
      ]
    : [
        { key: 'personal', label: 'Datos Personales' },
        { key: 'citas', label: `Citas (${citasActivas.length})` },
      ];

  return (
    <div className="flex-1 flex flex-col p-6 bg-slate-50 min-h-screen space-y-5">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* BACK */}
      <button onClick={() => navigate('/pacientes')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors self-start">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver a Pacientes
      </button>

      {/* ── PATIENT HEADER ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0 shadow-md"
            style={{ backgroundColor: PRIMARY }}>
            {paciente.nombre.charAt(0)}{paciente.apellidos.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-gray-900">{paciente.nombre} {paciente.apellidos}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                paciente.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>{paciente.activo ? 'Activa' : 'Inactiva'}</span>
              {isDoctor && datosClinicos?.alerta_activa && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200">
                  ⚠ Alerta activa
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
              <span><strong className="text-gray-700 font-semibold">DNI</strong> {paciente.dni}</span>
              <span><strong className="text-gray-700 font-semibold">Edad</strong> {edad} años</span>
              {paciente.telefono_principal && (
                <span><strong className="text-gray-700 font-semibold">Tel.</strong> {paciente.telefono_principal}</span>
              )}
              <span>
                <strong className="text-gray-700 font-semibold">Médico</strong>{' '}
                {medicoAsignado ? `Dr. ${medicoAsignado.nombre} ${medicoAsignado.apellidos}` : <em className="text-gray-400">Sin asignar</em>}
              </span>
              {isDoctor && datosClinicos?.edad_gestacional_semanas && (
                <span><strong className="text-gray-700 font-semibold">Semanas</strong> {datosClinicos.edad_gestacional_semanas} sem</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {/* Secretaria: editar datos personales */}
            {!isDoctor && (
              <button onClick={handleOpenEditPatient}
                className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
                style={{ backgroundColor: PRIMARY }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Actualizar Datos
              </button>
            )}
            {/* Médico: ir a tab clínico */}
            {isDoctor && (
              <button onClick={() => setActiveTab('clinico')}
                className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
                style={{ backgroundColor: PRIMARY }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {dcExists ? 'Actualizar datos clínicos' : 'Registrar datos clínicos'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === tab.key ? { color: PRIMARY } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: DATOS PERSONALES ─────────────────────────────────────────── */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-800">Datos Personales</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Nombre Completo', value: `${paciente.nombre} ${paciente.apellidos}` },
              { label: 'DNI', value: paciente.dni },
              { label: 'Fecha Nacimiento', value: formatDate(paciente.fecha_nacimiento) },
              { label: 'Edad', value: `${edad} años` },
              { label: 'Teléfono', value: paciente.telefono_principal || '—' },
              { label: 'Correo Electrónico', value: paciente.email || '—' },
              { label: 'Médico Asignado', value: medicoAsignado ? `Dr. ${medicoAsignado.nombre} ${medicoAsignado.apellidos}` : 'Sin asignar' },
              { label: 'Estado', value: paciente.activo ? 'Activa' : 'Inactiva' },
              { label: 'Fecha de Registro', value: formatDate(paciente.created_at) },
              { label: 'Última Actualización', value: formatDate(paciente.updated_at) },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-xl border border-gray-100 bg-slate-50/60">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: DATOS CLÍNICOS (solo médico) ────────────────────────────── */}
      {activeTab === 'clinico' && isDoctor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-bold text-gray-800">Datos Clínicos</h3>
            </div>
            {!dcExists && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-semibold">
                Sin datos registrados aún
              </span>
            )}
          </div>
          <form onSubmit={handleSaveDc} className="p-6">
            <DcFormView form={dcForm} onChange={(key, value) => setDcForm(prev => ({ ...prev, [key]: value }))} />
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setDcForm(datosClinicos ? dcFromResponse(datosClinicos) : emptyDcForm)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E8D5EF' }}>
                Descartar cambios
              </button>
              <button type="submit" disabled={isSavingDc}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
                style={{ backgroundColor: PRIMARY }}>
                {isSavingDc ? 'Guardando...' : dcExists ? 'Guardar Datos Clínicos' : 'Registrar Datos Clínicos'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: CITAS ────────────────────────────────────────────────────── */}
      {activeTab === 'citas' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-sm font-bold text-gray-800">Historial de Citas</h3>
            </div>
            {/* Nueva cita: solo secretaria */}
            {!isDoctor && (
              <button onClick={handleOpenCreateCita}
                className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: PRIMARY }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nueva Cita
              </button>
            )}
            {/* Resumen pendientes para médico */}
            {isDoctor && citasPendientes.length > 0 && (
              <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-full font-semibold">
                {citasPendientes.length} pendiente{citasPendientes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {citas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">Sin citas registradas</p>
              {!isDoctor && (
                <button onClick={handleOpenCreateCita}
                  className="text-xs font-bold py-2 px-4 rounded-lg text-white hover:opacity-90"
                  style={{ backgroundColor: PRIMARY }}>
                  Agendar primera cita
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Médico</th>
                    <th className="py-3.5 px-4">Tipo de Cita</th>
                    <th className="py-3.5 px-4">Duración</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {citas.map(cita => (
                    <tr key={cita.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="text-sm font-bold text-gray-900">{formatHour(cita.fecha_hora)}</p>
                        <p className="text-[10px] text-gray-400">{new Date(cita.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">
                        {cita.medico_nombre ? `Dr. ${cita.medico_nombre.split(' ')[0]}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">{cita.motivo || 'Control Prenatal'}</td>
                      <td className="py-3.5 px-4 text-sm text-gray-500">{cita.duracion_minutos} min</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(cita.estado)}`}>
                          {getStatusLabel(cita.estado)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* MÉDICO: solo puede atender citas programadas/en_atencion */}
                          {isDoctor && (cita.estado === 'programada' || cita.estado === 'en_atencion') && (
                            <button onClick={() => handleOpenAtender(cita)}
                              title="Atender cita y registrar datos clínicos"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                              style={{ backgroundColor: '#F5EDF2', color: PRIMARY, borderColor: '#E8D5EF' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EDD9E6')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F5EDF2')}>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Atender</span>
                            </button>
                          )}
                          {/* MÉDICO: citas ya atendidas/canceladas — solo info */}
                          {isDoctor && (cita.estado === 'cumplida' || cita.estado === 'cancelada') && (
                            <span className="text-[10px] text-gray-400 italic px-2">
                              {cita.estado === 'cumplida' ? 'Atendida' : 'Cancelada'}
                            </span>
                          )}

                          {/* SECRETARIA: editar y cancelar */}
                          {!isDoctor && (
                            <>
                              <button onClick={() => handleOpenEditCita(cita)}
                                disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                                title="Editar cita"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-semibold border border-amber-100 disabled:opacity-30 disabled:pointer-events-none">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Editar</span>
                              </button>
                              <button onClick={() => { setSelectedCita(cita); setCitaModal('delete'); }}
                                disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                                title="Cancelar cita"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold border border-red-100 disabled:opacity-30 disabled:pointer-events-none">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Cancelar</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Editar paciente (secretaria) */}
      {showEditPatient && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
             onClick={() => setShowEditPatient(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
                  <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-900">Editar Datos del Paciente</h2>
              </div>
              <button onClick={() => setShowEditPatient(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSavePatient} className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
                <span className="text-sm font-bold text-gray-800">Datos Personales</span>
              </div>
              {[
                { name: 'nombre', label: 'Nombres completos *', required: true, type: 'text', placeholder: 'Ej. Ana Lucía' },
                { name: 'apellidos', label: 'Apellidos *', required: true, type: 'text', placeholder: 'Ej. Pérez García' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                  <input type={f.type} name={f.name} required={f.required} placeholder={f.placeholder}
                    value={(editForm as any)[f.name]}
                    onChange={e => setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">DNI (no editable)</label>
                  <input readOnly value={editForm.dni}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border bg-gray-50 text-gray-500 cursor-not-allowed"
                    style={{ borderColor: '#E8D5EF' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de nacimiento</label>
                  <input type="date" name="fecha_nacimiento" value={editForm.fecha_nacimiento}
                    onChange={e => setEditForm(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono principal</label>
                  <input name="telefono_principal" value={editForm.telefono_principal}
                    onChange={e => setEditForm(prev => ({ ...prev, telefono_principal: e.target.value }))}
                    placeholder="999 000 000"
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Correo electrónico</label>
                  <input type="email" name="email" value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="paciente@ejemplo.com"
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditPatient(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E8D5EF' }}>Cancelar</button>
                <button type="submit" disabled={isSavingPatient}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: PRIMARY }}>
                  {isSavingPatient ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Cita Create/Edit (secretaria) */}
      {!isDoctor && (citaModal === 'create' || citaModal === 'edit') && (
        <CitaModal
          mode={citaModal}
          form={citaForm}
          pacienteNombre={`${paciente.nombre} ${paciente.apellidos}`}
          medicos={medicos}
          isSaving={isSavingCita}
          onClose={() => setCitaModal(null)}
          onSubmit={citaModal === 'create' ? handleCreateCita : handleEditCita}
          onChange={e => setCitaForm(prev => ({ ...prev, [e.target.name]: e.target.value }))}
          onDuracionChange={v => setCitaForm(prev => ({ ...prev, duracion_minutos: v }))}
        />
      )}

      {/* Cita Delete (secretaria) */}
      {!isDoctor && citaModal === 'delete' && selectedCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
             onClick={() => setCitaModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4"
               onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">¿Cancelar esta cita?</h3>
              <p className="text-sm text-gray-500 mt-2">Esta acción marcará la cita como <strong>"cancelada"</strong>.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCitaModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                Volver
              </button>
              <button onClick={handleDeleteCita} disabled={isSavingCita}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {isSavingCita ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ATENDER CITA (médico) ─────────────────────────────────────────── */}
      {isDoctor && atenderCita && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
             onClick={() => setAtenderCita(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
               onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
                  <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Atender Cita</h2>
                  <p className="text-xs text-gray-500">
                    {atenderCita.motivo} · {formatDate(atenderCita.fecha_hora)} {formatHour(atenderCita.fecha_hora)}
                  </p>
                </div>
              </div>
              <button onClick={() => setAtenderCita(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info banner */}
            <div className="mx-6 mt-5 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Registra o actualiza los datos clínicos de la paciente. Al guardar, la cita quedará marcada automáticamente como <strong>Atendida</strong>.
              </p>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form onSubmit={handleAtender}>
                <DcFormView
                  form={atenderDcForm}
                  onChange={(key, value) => setAtenderDcForm(prev => ({ ...prev, [key]: value }))}
                />
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setAtenderCita(null)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50"
                    style={{ borderColor: '#E8D5EF' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSavingAtender}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                    style={{ backgroundColor: PRIMARY }}>
                    {isSavingAtender ? 'Guardando...' : 'Guardar datos y marcar como Atendida'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
