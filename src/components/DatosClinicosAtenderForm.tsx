import type { DatosClinicosInput, DatosClinicosResponse } from '../services/api';

const PRIMARY = '#612853';

export const CHRONIC_CONDITION_FIELDS = [
  'diabetes_pregestacional',
  'diabetes_gestacional',
  'hipertension_cronica',
  'hipertension_gestacional',
  'eclampsia',
] as const;

export type ChronicConditionField = typeof CHRONIC_CONDITION_FIELDS[number];

export interface DcAtenderForm {
  edad_madre: string;
  edad_gestacional_semanas: string;
  longitud_cervical_mm: string;
  bmi: string;
  embarazo_multiple: string;
  parto_prematuro_previo: boolean;
  hipertension_gestacional: boolean;
  infeccion_activa: boolean;
  diabetes_pregestacional: boolean;
  diabetes_gestacional: boolean;
  hipertension_cronica: boolean;
  eclampsia: boolean;
  gonorrea: boolean;
  sifilis: boolean;
  clamidia: boolean;
  hepatitis_b: boolean;
  hepatitis_c: boolean;
}

export const emptyAtenderForm: DcAtenderForm = {
  edad_madre: '',
  edad_gestacional_semanas: '',
  longitud_cervical_mm: '',
  bmi: '',
  embarazo_multiple: '1',
  parto_prematuro_previo: false,
  hipertension_gestacional: false,
  infeccion_activa: false,
  diabetes_pregestacional: false,
  diabetes_gestacional: false,
  hipertension_cronica: false,
  eclampsia: false,
  gonorrea: false,
  sifilis: false,
  clamidia: false,
  hepatitis_b: false,
  hepatitis_c: false,
};

export const INFECTION_FIELDS = [
  'gonorrea',
  'sifilis',
  'clamidia',
  'hepatitis_b',
  'hepatitis_c',
] as const;

export type InfectionField = typeof INFECTION_FIELDS[number];

export function countCondicionesCronicas(form: Pick<DcAtenderForm, ChronicConditionField>): number {
  return CHRONIC_CONDITION_FIELDS.filter(field => form[field]).length;
}

export function hasActiveInfection(form: Pick<DcAtenderForm, InfectionField>): boolean {
  return INFECTION_FIELDS.some(field => form[field]);
}

/** Valida campos obligatorios antes de ejecutar el pipeline ML. */
export function validateAtenderForm(form: DcAtenderForm): string | null {
  if (!form.edad_gestacional_semanas || Number(form.edad_gestacional_semanas) <= 0) {
    return 'La edad gestacional (semanas) es obligatoria';
  }
  if (form.longitud_cervical_mm === '' || Number.isNaN(Number(form.longitud_cervical_mm))) {
    return 'La longitud cervical (mm) es obligatoria';
  }
  if (!form.bmi || Number(form.bmi) <= 0) {
    return 'El IMC (BMI) es obligatorio';
  }
  return null;
}

export function atenderFormFromResponse(
  dc: DatosClinicosResponse,
  edadMadre?: number | null,
): DcAtenderForm {
  return {
    edad_madre: edadMadre != null ? String(edadMadre) : '',
    edad_gestacional_semanas: dc.edad_gestacional_semanas != null ? String(dc.edad_gestacional_semanas) : '',
    longitud_cervical_mm: dc.longitud_cervical_mm != null ? String(dc.longitud_cervical_mm) : '',
    bmi: dc.bmi != null ? String(dc.bmi) : '',
    embarazo_multiple: String(dc.embarazo_multiple),
    parto_prematuro_previo: dc.parto_prematuro_previo,
    hipertension_gestacional: dc.hipertension_gestacional,
    infeccion_activa: dc.infeccion_activa,
    diabetes_pregestacional: dc.diabetes_pregestacional,
    diabetes_gestacional: dc.diabetes_gestacional,
    hipertension_cronica: dc.hipertension_cronica,
    eclampsia: dc.eclampsia,
    gonorrea: dc.gonorrea,
    sifilis: dc.sifilis,
    clamidia: dc.clamidia,
    hepatitis_b: dc.hepatitis_b,
    hepatitis_c: dc.hepatitis_c,
  };
}

export function atenderFormToPayload(
  form: DcAtenderForm,
  existing?: DatosClinicosResponse | null,
): DatosClinicosInput {
  const base = existing ?? null;
  return {
    edad_gestacional_semanas: form.edad_gestacional_semanas ? Number(form.edad_gestacional_semanas) : null,
    longitud_cervical_mm: form.longitud_cervical_mm ? Number(form.longitud_cervical_mm) : null,
    embarazo_multiple: Number(form.embarazo_multiple) || 1,
    parto_prematuro_previo: form.parto_prematuro_previo,
    hipertension_gestacional: form.hipertension_gestacional,
    bmi: form.bmi ? Number(form.bmi) : null,
    bmi_categoria: base?.bmi_categoria ?? null,
    num_condiciones_cronicas: countCondicionesCronicas(form),
    infeccion_activa: hasActiveInfection(form),
    diabetes_pregestacional: form.diabetes_pregestacional,
    diabetes_gestacional: form.diabetes_gestacional,
    hipertension_cronica: form.hipertension_cronica,
    eclampsia: form.eclampsia,
    hepatitis_b: form.hepatitis_b,
    hepatitis_c: form.hepatitis_c,
    sifilis: form.sifilis,
    clamidia: form.clamidia,
    gonorrea: form.gonorrea,
    cesareas_previas: base?.cesareas_previas ?? false,
    num_cesareas: base?.num_cesareas ?? 0,
    num_partos_previos_vivos: base?.num_partos_previos_vivos ?? 0,
    alerta_activa: base?.alerta_activa ?? false,
    notas_medicas: base?.notas_medicas ?? null,
  };
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${checked ? '' : 'bg-gray-200'}`}
      style={checked ? { backgroundColor: PRIMARY } : {}}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

interface DcAtenderFormViewProps {
  form: DcAtenderForm;
  onChange: (form: DcAtenderForm) => void;
}

export function DcAtenderFormView({ form, onChange }: DcAtenderFormViewProps) {
  const inputCls = 'w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white';
  const borderNormal = '#E8D5EF';
  const chronicCount = countCondicionesCronicas(form);

  const setField = <K extends keyof DcAtenderForm>(key: K, value: DcAtenderForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const ToggleRow = ({ label, field }: { label: string; field: keyof DcAtenderForm }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <Toggle
        checked={form[field] as boolean}
        onChange={v => setField(field, v as DcAtenderForm[typeof field])}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
          <span className="text-sm font-bold text-gray-800">Datos Clínicos de la Consulta</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Edad de la madre (años)</label>
            <input type="number" min="10" max="60" value={form.edad_madre}
              onChange={e => setField('edad_madre', e.target.value)}
              placeholder="Ej. 28"
              className={inputCls} style={{ borderColor: borderNormal }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Edad gestacional (semanas)</label>
            <input type="number" min="20" max="45" required value={form.edad_gestacional_semanas}
              onChange={e => setField('edad_gestacional_semanas', e.target.value)}
              placeholder="20–45"
              className={inputCls} style={{ borderColor: borderNormal }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Longitud cervical (mm)</label>
            <input type="number" min="0" step="0.1" required value={form.longitud_cervical_mm}
              onChange={e => setField('longitud_cervical_mm', e.target.value)}
              placeholder="Ej. 25.5"
              className={inputCls} style={{ borderColor: borderNormal }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Índice de masa corporal (IMC)</label>
            <input type="number" min="10" max="60" step="0.1" required value={form.bmi}
              onChange={e => setField('bmi', e.target.value)}
              placeholder="Ej. 24.5"
              className={inputCls} style={{ borderColor: borderNormal }} />
          </div>
        </div>

        <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Número de fetos (embarazo múltiple)</label>
            <select value={form.embarazo_multiple} onChange={e => setField('embarazo_multiple', e.target.value)}
              className={inputCls} style={{ borderColor: borderNormal }}>
              <option value="1">1 feto</option>
              <option value="2">2 fetos (gemelos)</option>
              <option value="3">3 fetos (trillizos)</option>
            </select>
          </div>
          <ToggleRow label="Parto prematuro previo" field="parto_prematuro_previo" />
          <ToggleRow label="Hipertensión gestacional" field="hipertension_gestacional" />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
          <span className="text-sm font-bold text-gray-800">Condiciones crónicas relevantes</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
          <ToggleRow label="Diabetes pregestacional" field="diabetes_pregestacional" />
          <ToggleRow label="Diabetes gestacional" field="diabetes_gestacional" />
          <ToggleRow label="Hipertensión crónica" field="hipertension_cronica" />
          <ToggleRow label="Eclampsia" field="eclampsia" />
        </div>
        <div className="mt-3 p-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">Número de condiciones crónicas relevantes</span>
          <span className="text-lg font-extrabold" style={{ color: PRIMARY }}>{chronicCount}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Se calcula automáticamente al activar cada condición crónica.</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
          <span className="text-sm font-bold text-gray-800">Infecciones Activas</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
          <ToggleRow label="Gonorrea" field="gonorrea" />
          <ToggleRow label="Sífilis" field="sifilis" />
          <ToggleRow label="Clamidia" field="clamidia" />
          <ToggleRow label="Hepatitis B" field="hepatitis_b" />
          <ToggleRow label="Hepatitis C" field="hepatitis_c" />
        </div>
        <div className="mt-3 p-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">Infección activa detectada</span>
          <span className="text-lg font-extrabold" style={{ color: PRIMARY }}>{hasActiveInfection(form) ? 'Sí' : 'No'}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Se calcula automáticamente al activar cada infección.</p>
      </div>
    </div>
  );
}

interface DcAtenderReadonlyProps {
  form: DcAtenderForm;
}

export function DcAtenderReadonlyView({ form }: DcAtenderReadonlyProps) {
  const chronicCount = countCondicionesCronicas(form);
  const boolLabel = (v: boolean) => (v ? 'Sí' : 'No');

  const activeInfection = hasActiveInfection(form);
  const rows = [
    ['Edad de la madre', form.edad_madre ? `${form.edad_madre} años` : '—'],
    ['Parto prematuro previo', boolLabel(form.parto_prematuro_previo)],
    ['Embarazo múltiple', `${form.embarazo_multiple} feto(s)`],
    ['Hipertensión gestacional', boolLabel(form.hipertension_gestacional)],
    ['Edad gestacional', form.edad_gestacional_semanas ? `${form.edad_gestacional_semanas} semanas` : '—'],
    ['Condiciones crónicas relevantes', String(chronicCount)],
    ['Longitud cervical', form.longitud_cervical_mm ? `${form.longitud_cervical_mm} mm` : '—'],
    ['IMC', form.bmi || '—'],
    ['Infección activa', boolLabel(activeInfection)],
    ['Diabetes pregestacional', boolLabel(form.diabetes_pregestacional)],
    ['Diabetes gestacional', boolLabel(form.diabetes_gestacional)],
    ['Hipertensión crónica', boolLabel(form.hipertension_cronica)],
    ['Eclampsia', boolLabel(form.eclampsia)],
    ['Gonorrea', boolLabel(form.gonorrea)],
    ['Sífilis', boolLabel(form.sifilis)],
    ['Clamidia', boolLabel(form.clamidia)],
    ['Hepatitis B', boolLabel(form.hepatitis_b)],
    ['Hepatitis C', boolLabel(form.hepatitis_c)],
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
          <span className="text-sm font-bold text-gray-900">{value}</span>
        </div>
      ))}
    </div>
  );
}
