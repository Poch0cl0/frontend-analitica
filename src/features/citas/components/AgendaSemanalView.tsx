import { useCallback, useEffect, useState } from 'react';
import {
  getDisponibilidadSemana,
  type DisponibilidadSemanaResponse,
  type SlotSemanal,
} from '../../../services/api';
import { PRIMARY } from '../../../constants/theme';
import { formatLocalDate } from '../../../utils/date';

export interface SlotSeleccionado {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  medicosDisponibles: { medico_id: number; nombre: string }[];
}

interface AgendaSemanalViewProps {
  duracionMinutos: number;
  onSelectSlot: (slot: SlotSeleccionado) => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

export default function AgendaSemanalView({ duracionMinutos, onSelectSlot }: AgendaSemanalViewProps) {
  const [semanaRef, setSemanaRef] = useState(() => formatLocalDate(new Date()));
  const [data, setData] = useState<DisponibilidadSemanaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDisponibilidadSemana(semanaRef, duracionMinutos);
      setData(res);
    } catch {
      setError('No se pudo cargar la disponibilidad semanal.');
    } finally {
      setIsLoading(false);
    }
  }, [semanaRef, duracionMinutos]);

  useEffect(() => { load(); }, [load]);

  const handleSlotClick = (fecha: string, slot: SlotSemanal) => {
    if (!slot.disponible || slot.medicos_disponibles.length === 0) return;
    onSelectSlot({
      fecha,
      horaInicio: slot.hora_inicio,
      horaFin: slot.hora_fin,
      medicosDisponibles: slot.medicos_disponibles,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-8 animate-spin" style={{ borderTopColor: PRIMARY }} />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSemanaRef(addDays(data.fecha_inicio, -7))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            ← Semana anterior
          </button>
          <button
            type="button"
            onClick={() => setSemanaRef(formatLocalDate(new Date()))}
            className="px-3 py-2 rounded-lg border border-fuchsia-200 text-sm font-semibold text-fuchsia-900 hover:bg-fuchsia-50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSemanaRef(addDays(data.fecha_inicio, 7))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Semana siguiente →
          </button>
        </div>
        <p className="text-sm text-gray-500 font-medium">
          {data.fecha_inicio} — {data.fecha_fin}
        </p>
      </div>

      <p className="text-xs text-gray-500">
        Haz clic en un horario disponible (verde) para asignar una cita. Duración: {duracionMinutos} min.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
        {data.dias.map((dia) => (
          <div
            key={dia.fecha}
            className={`rounded-xl border p-3 min-h-[200px] ${
              dia.es_laborable ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="mb-3 pb-2 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase">{dia.nombre_dia}</p>
              <p className="text-sm font-extrabold text-gray-900">{dia.fecha.slice(5)}</p>
            </div>

            {!dia.es_laborable ? (
              <div className="text-center py-4">
                <span className="inline-block px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold">
                  No laborable
                </span>
                {dia.motivo_no_laborable && (
                  <p className="text-xs text-gray-500 mt-2">{dia.motivo_no_laborable}</p>
                )}
              </div>
            ) : dia.slots.filter((s) => s.disponible).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin horarios libres</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {dia.slots.filter((s) => s.disponible).map((slot) => (
                  <button
                    key={slot.hora_inicio}
                    type="button"
                    onClick={() => handleSlotClick(dia.fecha, slot)}
                    className="w-full text-left px-2.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <p className="text-xs font-bold text-emerald-900">
                      {slot.hora_inicio} – {slot.hora_fin}
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5 truncate">
                      {slot.medicos_disponibles.map((m) => m.nombre.split(' ')[0]).join(', ')}
                      {slot.medicos_disponibles.length > 1 && ` (+${slot.medicos_disponibles.length})`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
