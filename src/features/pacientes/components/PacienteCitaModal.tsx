import type { FormEvent, ChangeEvent } from 'react';
import DisponibilidadSlots from '../../../components/ui/DisponibilidadSlots';
import DisponibilidadMesPicker from '../../../components/ui/DisponibilidadMesPicker';
import SearchableEntitySelect from '../../../components/ui/SearchableEntitySelect';
import { useDisponibilidadCita } from '../../../hooks/useDisponibilidadCita';
import { PRIMARY } from '../../../constants/theme';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import type { MedicoResumen } from '../../../services/api';

export interface CitaFormData {
  fecha: string;
  hora: string;
  medico_id: string;
  duracion_minutos: number;
  notas: string;
}

interface PacienteCitaModalProps {
  mode: 'create' | 'edit';
  form: CitaFormData;
  pacienteNombre: string;
  medicos: MedicoResumen[];
  isSaving: boolean;
  simplified?: boolean;
  medicoAsignadoLabel?: string | null;
  medicoIdForDisponibilidad: number | null;
  excluirCitaId?: number | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onMedicoChange: (medicoId: string) => void;
  onDuracionChange: (v: number) => void;
  onSelectHora: (hora: string) => void;
}

export default function PacienteCitaModal({
  mode,
  form,
  pacienteNombre,
  medicos,
  isSaving,
  simplified,
  medicoAsignadoLabel,
  medicoIdForDisponibilidad,
  excluirCitaId,
  onClose,
  onSubmit,
  onChange,
  onMedicoChange,
  onDuracionChange,
  onSelectHora,
}: PacienteCitaModalProps) {
  const inputCls = 'w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white';
  const borderStyle = { borderColor: '#E8D5EF' };
  const { slots, motivoNoLaborable, motivoInvalido, isLoadingSlots, horarioValido } = useDisponibilidadCita(
    medicoIdForDisponibilidad,
    form.fecha,
    form.hora,
    form.duracion_minutos,
    excluirCitaId,
  );
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" {...backdrop}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
              <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">{mode === 'create' ? 'Nueva Cita Médica' : 'Editar Cita Médica'}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">✕</button>
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
            {simplified && mode === 'create' ? (
              medicoAsignadoLabel ? (
                <div className="p-3 rounded-xl bg-fuchsia-50/50 border border-fuchsia-100 text-xs text-gray-600">
                  Médico asignado: <strong className="text-gray-800">{medicoAsignadoLabel}</strong>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800 font-semibold">
                  Esta paciente no tiene médico asignado.
                </div>
              )
            ) : (
              <SearchableEntitySelect
                mode="medico"
                label="Obstetra Médico *"
                value={form.medico_id}
                onChange={(medicoId) => {
                  onMedicoChange(medicoId);
                  onChange({ target: { name: 'fecha', value: '' } } as ChangeEvent<HTMLInputElement>);
                  onSelectHora('');
                }}
                medicos={medicos}
                required
              />
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha *</label>
              <DisponibilidadMesPicker
                medicoId={medicoIdForDisponibilidad}
                value={form.fecha}
                duracionMinutos={form.duracion_minutos}
                onChange={(fecha) => {
                  onChange({ target: { name: 'fecha', value: fecha } } as ChangeEvent<HTMLInputElement>);
                  onSelectHora('');
                }}
              />
              <input type="hidden" name="fecha" required value={form.fecha} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Hora *</label>
              <input type="time" name="hora" required value={form.hora} onChange={onChange} className={inputCls} style={borderStyle} />
            </div>
            {medicoIdForDisponibilidad && form.fecha && (
              <DisponibilidadSlots
                slots={slots}
                horaSeleccionada={form.hora}
                isLoading={isLoadingSlots}
                motivoNoLaborable={motivoNoLaborable}
                onSelect={onSelectHora}
              />
            )}
            {!horarioValido && form.hora && !isLoadingSlots && (
              <p className="text-xs text-red-600 font-medium">
                {motivoInvalido ?? 'El horario seleccionado no está disponible para la duración indicada.'}
              </p>
            )}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-500">Duración de la consulta</label>
                <span className="text-xs font-bold" style={{ color: PRIMARY }}>{form.duracion_minutos} min</span>
              </div>
              <input type="range" min="15" max="120" step="15" value={form.duracion_minutos} onChange={(e) => onDuracionChange(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" style={{ accentColor: PRIMARY }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Notas o Comentarios</label>
              <textarea name="notas" rows={3} value={form.notas} onChange={onChange} placeholder="Síntomas iniciales, antecedentes..." className={`${inputCls} resize-none`} style={borderStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50" style={{ borderColor: '#E8D5EF' }}>Cancelar</button>
              <button type="submit" disabled={isSaving || !horarioValido || isLoadingSlots} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm" style={{ backgroundColor: PRIMARY }}>
                {isSaving ? 'Guardando...' : mode === 'create' ? 'Agendar Cita' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
