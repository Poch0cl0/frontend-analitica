import { type FormEvent, type ChangeEvent } from 'react';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';

const PRIMARY = '#612853';

function calcEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export interface PatientForm {
  nombre: string;
  apellidos: string;
  dni: string;
  fecha_nacimiento: string;
  telefono_principal: string;
  email: string;
}

interface PatientModalProps {
  mode: 'create' | 'edit';
  form: PatientForm;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function PatientModal({ mode, form, isSaving, onClose, onSubmit, onChange }: PatientModalProps) {
  const edad = form.fecha_nacimiento ? calcEdad(form.fecha_nacimiento) : '';
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
         {...backdrop}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
              <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mode === 'create'
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                }
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {mode === 'create' ? 'Registrar Nueva Paciente' : 'Editar Datos del Paciente'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-4 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
              <span className="text-sm font-bold text-gray-800">Datos Personales</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombres completos *</label>
                <input name="nombre" required value={form.nombre} onChange={onChange} placeholder="Ej. Ana Lucía"
                  className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{ borderColor: '#E8D5EF' }}
                  onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                  onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Apellidos *</label>
                <input name="apellidos" required value={form.apellidos} onChange={onChange} placeholder="Ej. Pérez García"
                  className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                  style={{ borderColor: '#E8D5EF' }}
                  onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                  onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    DNI {mode === 'edit' ? '(no editable)' : '*'}
                  </label>
                  <input
                    name="dni"
                    required={mode === 'create'}
                    readOnly={mode === 'edit'}
                    value={form.dni}
                    onChange={onChange}
                    placeholder="8 dígitos"
                    inputMode="numeric"
                    maxLength={8}
                    className={`w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all ${
                      mode === 'edit' ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                    }`}
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => { if (mode !== 'edit') e.currentTarget.style.borderColor = PRIMARY; }}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de nacimiento *</label>
                  <input type="date" name="fecha_nacimiento" required value={form.fecha_nacimiento} onChange={onChange}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Edad</label>
                  <input readOnly value={edad ? `${edad} años` : ''} placeholder="Auto-calculada"
                    className="w-full text-sm px-3 py-2.5 rounded-lg border bg-gray-50 text-gray-500 cursor-not-allowed"
                    style={{ borderColor: '#E8D5EF' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono principal</label>
                  <input
                    name="telefono_principal"
                    value={form.telefono_principal}
                    onChange={onChange}
                    placeholder="9XXXXXXXX"
                    inputMode="numeric"
                    maxLength={9}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Correo electrónico (Opcional)</label>
                <input type="email" name="email" value={form.email} onChange={onChange} placeholder="paciente@ejemplo.com"
                  className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                  style={{ borderColor: '#E8D5EF' }}
                  onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                  onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              El médico asignado se establecerá automáticamente al agendar la primera cita.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E8D5EF' }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
              style={{ backgroundColor: PRIMARY }}
            >
              {isSaving ? 'Guardando...' : mode === 'create' ? 'Registrar Paciente' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
