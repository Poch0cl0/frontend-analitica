import { useState, type FormEvent } from 'react';
import { PRIMARY } from '../../../constants/theme';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import SearchableEntitySelect from '../../../components/ui/SearchableEntitySelect';
import { validarHorarioCita } from '../../../services/api';
import { getApiErrorMessage } from '../../../services/client';
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
  const libres = slot.medicosDisponibles;
  const [pacienteId, setPacienteId] = useState('');
  const [medicoId, setMedicoId] = useState(
    libres.length === 1 ? String(libres[0].medico_id) : '',
  );
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pacienteId || !medicoId) return;
    setError(null);
    setValidating(true);
    try {
      const [h, m] = slot.horaInicio.split(':').map(Number);
      const [hf, mf] = slot.horaFin.split(':').map(Number);
      const duracion = Math.max(15, (hf * 60 + mf) - (h * 60 + m));
      const check = await validarHorarioCita(Number(medicoId), slot.fecha, slot.horaInicio, duracion);
      if (!check.disponible) {
        setError(check.motivo || 'Ese médico ya no tiene ese horario libre. Elija otro o actualice la agenda.');
        return;
      }
      onSubmit({
        paciente_id: Number(pacienteId),
        medico_id: Number(medicoId),
        fecha: slot.fecha,
        horaInicio: slot.horaInicio,
        horaFin: slot.horaFin,
        notas,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo validar el horario. Reintente.'));
    } finally {
      setValidating(false);
    }
  };

  const backdrop = useModalBackdrop(onClose);
  const busy = isSaving || validating;

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
            <p className="text-[11px] text-gray-500 mt-1">
              Solo se listan médicos libres en este horario.
            </p>
          </div>

          {libres.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
              No hay médicos libres en este horario. Cierre e intente con otro slot verde.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                Médico libre en este horario * ({libres.length})
              </label>
              <select
                required
                value={medicoId}
                onChange={(e) => { setMedicoId(e.target.value); setError(null); }}
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
              >
                <option value="">Seleccionar médico libre</option>
                {libres.map((m) => (
                  <option key={m.medico_id} value={m.medico_id}>
                    Dr. {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {error && (
            <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg p-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !pacienteId || !medicoId || libres.length === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {validating ? 'Validando...' : isSaving ? 'Guardando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
