import { useState, type FormEvent } from 'react';
import { PRIMARY } from '../../../constants/theme';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import SearchableEntitySelect from '../../../components/ui/SearchableEntitySelect';
import type { SlotSeleccionado } from './AgendaSemanalView';

interface AgendarDesdeSlotModalProps {
  slot: SlotSeleccionado;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    paciente_id: number;
    medico_id: number;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    notas: string;
  }) => void;
}

export default function AgendarDesdeSlotModal({
  slot,
  isSaving,
  onClose,
  onSubmit,
}: AgendarDesdeSlotModalProps) {
  const [pacienteId, setPacienteId] = useState('');
  const [medicoId, setMedicoId] = useState(
    slot.medicosDisponibles.length === 1 ? String(slot.medicosDisponibles[0].medico_id) : '',
  );
  const [notas, setNotas] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pacienteId || !medicoId) return;
    onSubmit({
      paciente_id: Number(pacienteId),
      medico_id: Number(medicoId),
      fecha: slot.fecha,
      horaInicio: slot.horaInicio,
      horaFin: slot.horaFin,
      notas,
    });
  };

  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-extrabold text-lg text-gray-900">Confirmar cita</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-fuchsia-50 border border-fuchsia-100 text-sm">
            <p className="font-bold text-gray-900">{slot.fecha}</p>
            <p className="text-fuchsia-900 font-semibold">{slot.horaInicio} – {slot.horaFin}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Médico disponible *</label>
            <select
              required
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            >
              <option value="">Seleccionar médico</option>
              {slot.medicosDisponibles.map((m) => (
                <option key={m.medico_id} value={m.medico_id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <SearchableEntitySelect
            mode="paciente"
            label="Paciente *"
            value={pacienteId}
            onChange={setPacienteId}
            required
          />

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Notas</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !pacienteId || !medicoId}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {isSaving ? 'Guardando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
