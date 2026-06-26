import type { DatosClinicosInput, DatosClinicosResponse } from '../services/api';

const PRIMARY = '#612853';

export interface DcForm {
  edad_gestacional_semanas: string;
  longitud_cervical_mm: string;
  embarazo_multiple: string;
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

export const emptyDcForm: DcForm = {
  edad_gestacional_semanas: '', longitud_cervical_mm: '',
  embarazo_multiple: '1', parto_prematuro_previo: false,
  hipertension_gestacional: false, bmi: '', bmi_categoria: '',
  num_condiciones_cronicas: '0', infeccion_activa: false,
  diabetes_pregestacional: false, diabetes_gestacional: false,
  hipertension_cronica: false, eclampsia: false,
  hepatitis_b: false, hepatitis_c: false, sifilis: false,
  clamidia: false, gonorrea: false, cesareas_previas: false,
  num_cesareas: '0', num_partos_previos_vivos: '0',
  alerta_activa: false, notas_medicas: '',
};

const BMI_CATEGORIAS = [
  { value: '', label: '— Sin calcular —' },
  { value: 'bajo_peso', label: 'Bajo Peso (<18.5)' },
  { value: 'normal', label: 'Normal (18.5–24.9)' },
  { value: 'sobrepeso', label: 'Sobrepeso (25–29.9)' },
  { value: 'obesidad_I', label: 'Obesidad I (30–34.9)' },
  { value: 'obesidad_II', label: 'Obesidad II (35–39.9)' },
  { value: 'obesidad_III', label: 'Obesidad III (≥40)' },
];

export function dcFromResponse(dc: DatosClinicosResponse): DcForm {
  return {
    edad_gestacional_semanas: dc.edad_gestacional_semanas !== null ? String(dc.edad_gestacional_semanas) : '',
    longitud_cervical_mm: dc.longitud_cervical_mm !== null ? String(dc.longitud_cervical_mm) : '',
    embarazo_multiple: String(dc.embarazo_multiple),
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

export function dcToPayload(form: DcForm): DatosClinicosInput {
  return {
    edad_gestacional_semanas: form.edad_gestacional_semanas ? Number(form.edad_gestacional_semanas) : null,
    longitud_cervical_mm: form.longitud_cervical_mm ? Number(form.longitud_cervical_mm) : null,
    embarazo_multiple: Number(form.embarazo_multiple) || 1,
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${checked ? '' : 'bg-gray-200'}`}
      style={checked ? { backgroundColor: PRIMARY } : {}}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

interface DcFormViewProps {
  form: DcForm;
  onChange: (key: keyof DcForm, value: string | boolean) => void;
}

export function DcFormView({ form, onChange }: DcFormViewProps) {
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
              className={inputCls} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}>
              {BMI_CATEGORIAS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Número de fetos (embarazo múltiple)</label>
            <select value={form.embarazo_multiple} onChange={e => onChange('embarazo_multiple', e.target.value)}
              className={inputCls} style={{ borderColor: borderNormal }}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = borderNormal}>
              <option value="1">1 feto</option>
              <option value="2">2 fetos (gemelos)</option>
              <option value="3">3 fetos (trillizos)</option>
            </select>
          </div>
          <ToggleRow label="Parto prematuro previo" field="parto_prematuro_previo" />
        </div>
      </div>

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
