import { useState, type FormEvent } from 'react';
import { PRIMARY } from '../../../constants/theme';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import DisponibilidadSlots from '../../../components/ui/DisponibilidadSlots';
import { useDisponibilidadCita } from '../../../hooks/useDisponibilidadCita';
import SearchableEntitySelect from '../../../components/ui/SearchableEntitySelect';
import type { MedicoResumen, PacienteResponse } from '../../../services/api';

export interface NewCitaForm {
  paciente_id: string;
  medico_id: string;
  fecha: string;
  hora: string;
  notas: string;
  duracion_minutos: number;
  medico_asignado_fallback?: number | null;
}

interface CreateCitaModalProps {
  form: NewCitaForm;
  medicos: MedicoResumen[];
  isSecretary: boolean;
  isSaving: boolean;
  onClose: () => void;
  onChange: (form: NewCitaForm) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function CreateCitaModal({
  form,
  medicos,
  isSecretary,
  isSaving,
  onClose,
  onChange,
  onSubmit,
}: CreateCitaModalProps) {
  const [pickedPaciente, setPickedPaciente] = useState<PacienteResponse | null>(null);
  const medicoId = form.medico_id
    ? Number(form.medico_id)
    : isSecretary
      ? pickedPaciente?.medico_asignado_id ?? null
      : null;

  const {
    slots,
    motivoNoLaborable,
    motivoInvalido,
    resumenMedicos,
    isLoadingSlots,
    isLoadingResumen,
    showResumen,
    setShowResumen,
    horarioValido,
  } = useDisponibilidadCita(medicoId, form.fecha, form.hora, form.duracion_minutos);

  const canSubmit = horarioValido && !isSaving;
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-gray-900">Agendar Nueva Cita</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <SearchableEntitySelect
            mode="paciente"
            label="Paciente (Gestante) *"
            value={form.paciente_id}
            onChange={(v) => onChange({
              ...form,
              paciente_id: v,
              medico_asignado_fallback: v ? form.medico_asignado_fallback : null,
            })}
            onPacientePicked={(p) => {
              setPickedPaciente(p);
              onChange({
                ...form,
                paciente_id: String(p.id),
                medico_asignado_fallback: p.medico_asignado_id ?? null,
              });
            }}
            required
          />

          <SearchableEntitySelect
            mode="medico"
            label="Obstetra Médico *"
            value={form.medico_id}
            onChange={(v) => onChange({ ...form, medico_id: v })}
            medicos={medicos}
            required
          />
          {isSecretary && pickedPaciente && !form.medico_id && pickedPaciente.medico_asignado_id && (
            <p className="text-[10px] text-gray-500">
              Sugerido: médico asignado al expediente
            </p>
          )}

          {isSecretary && form.paciente_id && !form.medico_id && !pickedPaciente?.medico_asignado_id && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800 font-medium">
              Selecciona un médico disponible o usa la vista de Agenda semanal.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Fecha *</label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => onChange({ ...form, fecha: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Duración</label>
              <select
                value={form.duracion_minutos}
                onChange={(e) => onChange({ ...form, duracion_minutos: Number(e.target.value) })}
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
              >
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Inicio *</label>
              <input
                type="time"
                required
                value={form.hora}
                onChange={(e) => onChange({ ...form, hora: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Fin (calculado)</label>
              <input
                type="text"
                readOnly
                value={(() => {
                  if (!form.hora) return '';
                  const [h, m] = form.hora.split(':').map(Number);
                  const fin = h * 60 + m + form.duracion_minutos;
                  return `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
                })()}
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          {medicoId && form.fecha && (
            <DisponibilidadSlots
              slots={slots}
              horaSeleccionada={form.hora}
              isLoading={isLoadingSlots}
              motivoNoLaborable={motivoNoLaborable}
              onSelect={(hora) => onChange({ ...form, hora })}
            />
          )}

          {!horarioValido && form.hora && !isLoadingSlots && (
            <p className="text-xs text-red-600 font-medium">
              {motivoInvalido ?? 'El horario seleccionado no está disponible para la duración indicada.'}
            </p>
          )}

          {form.fecha && form.hora && (
            <button
              type="button"
              onClick={() => setShowResumen(!showResumen)}
              className="text-xs font-semibold text-fuchsia-900 hover:underline"
            >
              {showResumen ? 'Ocultar médicos disponibles' : 'Ver médicos disponibles a esta hora'}
            </button>
          )}

          {showResumen && (
            <div className="space-y-1 text-xs">
              {isLoadingResumen ? (
                <p className="text-gray-500">Consultando disponibilidad...</p>
              ) : (
                resumenMedicos.map((m) => (
                  <div key={m.medico_id} className="flex justify-between gap-2 p-2 rounded-lg bg-gray-50">
                    <span className="font-medium text-gray-800">{m.nombre}</span>
                    <span className={m.disponible ? 'text-emerald-700 font-semibold' : 'text-red-600'}>
                      {m.disponible ? 'Libre' : m.motivo || 'Ocupado'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Notas o Comentarios</label>
            <textarea
              rows={3}
              value={form.notas}
              onChange={(e) => onChange({ ...form, notas: e.target.value })}
              placeholder="Síntomas iniciales, antecedentes, requerimientos especiales..."
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="py-2.5 px-4 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="py-2.5 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {isSaving ? 'Programando...' : 'Programar Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
