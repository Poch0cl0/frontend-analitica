import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAgendaCalendario, type DiaCalendario } from '../../services/api';
import { DIAS_SEMANA_CORTO_LUNES, formatLocalDate } from '../../utils/date';
import { PRIMARY } from '../../constants/theme';

const DIAS_CABECERA = DIAS_SEMANA_CORTO_LUNES;

interface DisponibilidadMesPickerProps {
  medicoId: number | null;
  value: string;
  duracionMinutos?: number;
  onChange: (fecha: string) => void;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

export default function DisponibilidadMesPicker({
  medicoId,
  value,
  duracionMinutos = 30,
  onChange,
}: DisponibilidadMesPickerProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [cursor, setCursor] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return startOfMonth(today);
  });
  const [dias, setDias] = useState<DiaCalendario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      const next = new Date(y, m - 1, 1);
      setCursor((prev) =>
        prev.getFullYear() === next.getFullYear() && prev.getMonth() === next.getMonth()
          ? prev
          : next,
      );
    }
  }, [value]);

  useEffect(() => {
    if (!medicoId) {
      setDias([]);
      return;
    }
    const desde = startOfMonth(cursor);
    const hasta = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const fechaDesde = formatLocalDate(desde);
    const fechaHasta = formatLocalDate(hasta);
    let cancelled = false;
    setLoading(true);
    getAgendaCalendario(fechaDesde, fechaHasta, duracionMinutos, medicoId, 'libres', 'mes')
      .then((res) => {
        if (!cancelled) setDias(res.dias);
      })
      .catch(() => {
        if (!cancelled) setDias([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [medicoId, cursor, duracionMinutos]);

  const byFecha = useMemo(() => {
    const map = new Map<string, DiaCalendario>();
    for (const d of dias) map.set(d.fecha, d);
    return map;
  }, [dias]);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    // Monday-first grid (Python/ISO: Mon=0)
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: Array<{ key: string; date: Date | null; fecha: string | null }> = [];
    for (let i = 0; i < offset; i++) {
      out.push({ key: `pad-${i}`, date: null, fecha: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      out.push({ key: formatLocalDate(date), date, fecha: formatLocalDate(date) });
    }
    while (out.length % 7 !== 0) {
      out.push({ key: `pad-end-${out.length}`, date: null, fecha: null });
    }
    return out;
  }, [cursor]);

  if (!medicoId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-xs text-gray-500">
          Selecciona un médico para ver en el calendario los días con horario disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-gray-900 capitalize">{monthLabel(cursor)}</p>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DIAS_CABECERA.map((d) => (
          <div key={d} className="text-[10px] font-bold text-gray-400 text-center py-1">
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          if (!cell.date || !cell.fecha) {
            return <div key={cell.key} className="h-9" />;
          }
          const info = byFecha.get(cell.fecha);
          const isPast = cell.date < today;
          const isSelected = value === cell.fecha;
          const esFeriado = info ? !info.es_laborable : false;
          const tieneCupos = Boolean(info && info.es_laborable && info.total_libres > 0);
          const sinHorario =
            Boolean(info && info.es_laborable && info.total_libres === 0) || (!info && !loading);

          let cls =
            'h-9 rounded-lg text-xs font-semibold transition-colors border flex items-center justify-center ';
          if (isPast) {
            cls += 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed';
          } else if (esFeriado) {
            cls += 'bg-red-50 text-red-400 border-red-100 line-through cursor-not-allowed';
          } else if (tieneCupos) {
            cls += isSelected
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 cursor-pointer';
          } else if (sinHorario) {
            cls += isSelected
              ? 'bg-gray-400 text-white border-gray-500'
              : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed';
          } else {
            cls += 'bg-gray-50 text-gray-400 border-transparent';
          }

          const title = esFeriado
            ? info?.motivo_no_laborable || 'Día no laborable / feriado'
            : tieneCupos
              ? `${info?.total_libres ?? 0} horario(s) libre(s)`
              : isPast
                ? 'Fecha pasada'
                : 'Sin horario disponible';

          return (
            <button
              key={cell.key}
              type="button"
              title={title}
              disabled={isPast || esFeriado || !tieneCupos}
              onClick={() => onChange(cell.fecha!)}
              className={cls}
              style={isSelected && tieneCupos ? { backgroundColor: PRIMARY, borderColor: PRIMARY } : undefined}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 pt-1">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-300" /> Disponible
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200" /> Feriado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200" /> Sin cupo / sin horario
        </span>
      </div>

      {loading && <p className="text-[10px] text-gray-400">Cargando disponibilidad del mes...</p>}
      {value && (
        <p className="text-[11px] text-gray-600">
          Fecha seleccionada: <strong>{value}</strong>
        </p>
      )}
    </div>
  );
}
