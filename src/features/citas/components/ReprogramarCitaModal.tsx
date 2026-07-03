import { useState, type FormEvent } from 'react';
import {
  reprogramarCita,
  type CitaResponseEnriquecida,
  type MedicoResumen,
} from '../../../services/api';
import { PRIMARY } from '../../../constants/theme';
import { formatLocalDate } from '../../../utils/date';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import DisponibilidadSlots from '../../../components/ui/DisponibilidadSlots';
import SearchableEntitySelect from '../../../components/ui/SearchableEntitySelect';
import { useDisponibilidadCita } from '../../../hooks/useDisponibilidadCita';

interface ReprogramarCitaModalProps {
  cita: CitaResponseEnriquecida;
  medicos: MedicoResumen[];
  onClose: () => void;
  onDone: () => void;
}

export default function ReprogramarCitaModal({
  cita,
  medicos,
  onClose,
  onDone,
}: ReprogramarCitaModalProps) {
  const dt = new Date(cita.fecha_hora);
  const [fecha, setFecha] = useState(formatLocalDate(dt));
  const [hora, setHora] = useState(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`);
  const [medicoId, setMedicoId] = useState(String(cita.medico_id));
  const [duracion, setDuracion] = useState(cita.duracion_minutos);
  const [motivo, setMotivo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const medicoNum = medicoId ? Number(medicoId) : null;
  const { slots, motivoNoLaborable, motivoInvalido, isLoadingSlots, horarioValido } = useDisponibilidadCita(
    medicoNum,
    fecha,
    hora,
    duracion,
    cita.id,
  );

  const backdrop = useModalBackdrop(onClose);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!medicoNum || !horarioValido) return;
    setIsSaving(true);
    setError(null);
    const inicio = `${fecha}T${hora}:00`;
    try {
      await reprogramarCita(cita.id, {
        fecha_hora: inicio,
        duracion_minutos: duracion,
        medico_id: medicoNum,
        motivo: motivo || 'Reprogramada',
      });
      onDone();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'No se pudo reprogramar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-extrabold text-lg mb-1">Reprogramar cita</h3>
        <p className="text-xs text-gray-500 mb-4">
          Se creará una cita nueva y la actual quedará como reprogramada. Puede cambiar fecha, hora y médico.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <SearchableEntitySelect
            mode="medico"
            label="Médico"
            value={medicoId}
            onChange={setMedicoId}
            medicos={medicos}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="text-sm px-3 py-2 border rounded-xl" />
            <input type="time" required value={hora} onChange={(e) => setHora(e.target.value)} className="text-sm px-3 py-2 border rounded-xl" />
          </div>
          {medicoNum && fecha && (
            <DisponibilidadSlots
              slots={slots}
              horaSeleccionada={hora}
              isLoading={isLoadingSlots}
              motivoNoLaborable={motivoNoLaborable}
              onSelect={setHora}
            />
          )}
          {!horarioValido && hora && !isLoadingSlots && (
            <p className="text-xs text-amber-700">
              {motivoInvalido ?? 'El horario seleccionado no está disponible para la duración indicada.'}
            </p>
          )}
          <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className="w-full text-sm px-3 py-2 border rounded-xl">
            {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" className="w-full text-sm px-3 py-2 border rounded-xl" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-xl text-sm">Cancelar</button>
            <button
              type="submit"
              disabled={isSaving || !horarioValido || isLoadingSlots}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {isSaving ? 'Guardando...' : 'Reprogramar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
