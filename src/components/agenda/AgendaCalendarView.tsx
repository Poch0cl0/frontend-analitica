import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAgendaCalendario,
  getCitaEstadisticas,
  type AgendaCalendarioResponse,
  type CitaEstadisticasResponse,
  type DiaCalendario,
  type SlotCalendario,
} from '../../services/api';
import { PRIMARY } from '../../constants/theme';
import { formatLocalDate } from '../../utils/date';
import type { SlotSeleccionado } from '../../features/citas/components/AgendaSemanalView';

export type VistaCalendario = 'semana' | 'mes';
export type FiltroSlots = 'todos' | 'libres' | 'ocupados' | 'atendidas' | 'ausencias' | 'canceladas';

const FILTROS: { id: FiltroSlots; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'libres', label: 'Libres' },
  { id: 'ocupados', label: 'Ocupados' },
  { id: 'atendidas', label: 'Atendidas' },
  { id: 'ausencias', label: 'Ausencias' },
  { id: 'canceladas', label: 'Canceladas' },
];

const SLOT_COLORS: Record<string, string> = {
  libre: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
  programada: 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100',
  en_atencion: 'border-orange-200 bg-orange-50 text-orange-900',
  cumplida: 'border-gray-200 bg-gray-100 text-gray-700',
  cancelada: 'border-red-200 bg-red-50 text-red-800',
  reprogramada: 'border-purple-200 bg-purple-50 text-purple-800',
  no_asistio_paciente: 'border-amber-200 bg-amber-50 text-amber-900',
  no_asistio_medico: 'border-rose-200 bg-rose-50 text-rose-900',
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

function clampDate(dateStr: string, min: string, max: string): string {
  if (compareDates(dateStr, min) < 0) return min;
  if (compareDates(dateStr, max) > 0) return max;
  return dateStr;
}

function startOfMonth(dateStr: string): string {
  const d = parseDate(dateStr);
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(dateStr: string): string {
  const d = parseDate(dateStr);
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function addMonths(dateStr: string, months: number): string {
  const d = parseDate(startOfMonth(dateStr));
  d.setMonth(d.getMonth() + months);
  return formatLocalDate(d);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDisplayDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface AgendaCalendarViewProps {
  duracionMinutos: number;
  medicoId?: number | null;
  onSelectLibre: (slot: SlotSeleccionado) => void;
  onSelectOcupado: (citaId: number) => void;
}

export default function AgendaCalendarView({
  duracionMinutos,
  medicoId,
  onSelectLibre,
  onSelectOcupado,
}: AgendaCalendarViewProps) {
  const hoy = formatLocalDate(new Date());
  const [vista, setVista] = useState<VistaCalendario>('semana');
  const [rangoDesde, setRangoDesde] = useState(hoy);
  const [rangoHasta, setRangoHasta] = useState(() => addDays(hoy, 27));
  const [cursorFecha, setCursorFecha] = useState(hoy);
  const [filtro, setFiltro] = useState<FiltroSlots>('todos');
  const [data, setData] = useState<AgendaCalendarioResponse | null>(null);
  const [stats, setStats] = useState<CitaEstadisticasResponse | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ventana = useMemo(() => {
    if (compareDates(rangoDesde, rangoHasta) > 0) {
      return { desde: rangoDesde, hasta: rangoDesde };
    }
    if (vista === 'semana') {
      const cursor = clampDate(cursorFecha, rangoDesde, rangoHasta);
      const hasta = compareDates(addDays(cursor, 6), rangoHasta) <= 0
        ? addDays(cursor, 6)
        : rangoHasta;
      return { desde: cursor, hasta };
    }
    const mesInicio = startOfMonth(cursorFecha);
    const mesFin = endOfMonth(cursorFecha);
    return {
      desde: compareDates(mesInicio, rangoDesde) < 0 ? rangoDesde : mesInicio,
      hasta: compareDates(mesFin, rangoHasta) > 0 ? rangoHasta : mesFin,
    };
  }, [vista, cursorFecha, rangoDesde, rangoHasta]);

  const diasMap = useMemo(() => {
    const map = new Map<string, DiaCalendario>();
    data?.dias.forEach((d) => map.set(d.fecha, d));
    return map;
  }, [data]);

  const load = useCallback(async () => {
    if (compareDates(ventana.desde, ventana.hasta) > 0) {
      setData(null);
      setStats(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [cal, st] = await Promise.all([
        getAgendaCalendario(
          ventana.desde,
          ventana.hasta,
          duracionMinutos,
          medicoId ?? undefined,
          filtro,
          vista,
        ),
        getCitaEstadisticas(
          ventana.desde,
          ventana.hasta,
          medicoId ?? undefined,
          duracionMinutos,
        ),
      ]);
      setData(cal);
      setStats(st);
    } catch {
      setData(null);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [ventana.desde, ventana.hasta, duracionMinutos, medicoId, filtro, vista]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCursorFecha((c) => clampDate(c, rangoDesde, rangoHasta));
  }, [rangoDesde, rangoHasta]);

  const handleRangoDesde = (value: string) => {
    setRangoDesde(value);
    setCursorFecha(value);
    setDiaSeleccionado(value);
  };

  const handleRangoHasta = (value: string) => {
    setRangoHasta(value);
    setCursorFecha((c) => clampDate(c, rangoDesde, value));
  };

  const puedeRetroceder = vista === 'semana'
    ? compareDates(cursorFecha, rangoDesde) > 0
    : compareDates(endOfMonth(addMonths(cursorFecha, -1)), rangoDesde) >= 0;

  const lastWeekStart = useMemo(() => {
    const candidate = addDays(rangoHasta, -6);
    return compareDates(candidate, rangoDesde) >= 0 ? candidate : rangoDesde;
  }, [rangoDesde, rangoHasta]);

  const puedeAvanzar = vista === 'semana'
    ? compareDates(addDays(cursorFecha, 7), rangoHasta) <= 0
      || (compareDates(cursorFecha, lastWeekStart) < 0 && compareDates(addDays(cursorFecha, 7), lastWeekStart) > 0)
    : compareDates(startOfMonth(addMonths(cursorFecha, 1)), rangoHasta) <= 0;

  const navigate = (delta: number) => {
    if (vista === 'semana') {
      const next = addDays(cursorFecha, delta * 7);
      if (delta > 0) {
        setCursorFecha(
          compareDates(next, lastWeekStart) > 0 ? lastWeekStart : clampDate(next, rangoDesde, rangoHasta),
        );
      } else {
        setCursorFecha(clampDate(next, rangoDesde, rangoHasta));
      }
    } else {
      const nextMonth = addMonths(cursorFecha, delta);
      const monthStart = startOfMonth(nextMonth);
      if (compareDates(endOfMonth(nextMonth), rangoDesde) < 0) return;
      if (compareDates(monthStart, rangoHasta) > 0) return;
      setCursorFecha(monthStart);
    }
    setDiaSeleccionado(null);
  };

  const irHoy = () => {
    const target = clampDate(hoy, rangoDesde, rangoHasta);
    setCursorFecha(vista === 'mes' ? startOfMonth(target) : target);
    setDiaSeleccionado(target);
  };

  const handleSlotClick = (fecha: string, slot: SlotCalendario) => {
    if (compareDates(fecha, rangoDesde) < 0 || compareDates(fecha, rangoHasta) > 0) return;
    if (slot.tipo === 'libre' && slot.medicos_disponibles.length > 0) {
      onSelectLibre({
        fecha,
        horaInicio: slot.hora_inicio,
        horaFin: slot.hora_fin,
        medicosDisponibles: slot.medicos_disponibles,
      });
    } else if (slot.cita_id) {
      onSelectOcupado(slot.cita_id);
    }
  };

  const semanaDias = useMemo(() => {
    const start = clampDate(cursorFecha, rangoDesde, rangoHasta);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursorFecha, rangoDesde, rangoHasta]);

  const mesCalendario = useMemo(() => {
    const anchor = startOfMonth(cursorFecha);
    const d = parseDate(anchor);
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstWeekday = (d.getDay() + 6) % 7;
    const totalDays = daysInMonth(year, month);
    const cells: { fecha: string | null; inMonth: boolean }[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ fecha: null, inMonth: false });
    }
    for (let day = 1; day <= totalDays; day++) {
      const fecha = formatLocalDate(new Date(year, month, day));
      cells.push({ fecha, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ fecha: null, inMonth: false });
    }
    return { year, month, cells };
  }, [cursorFecha]);

  const tituloVentana = vista === 'semana'
    ? `${formatDisplayDate(ventana.desde)} — ${formatDisplayDate(ventana.hasta)}`
    : `${MESES[mesCalendario.month]} ${mesCalendario.year}`;

  const diaDetalle = diaSeleccionado ? diasMap.get(diaSeleccionado) : null;

  const enRango = (fecha: string) =>
    compareDates(fecha, rangoDesde) >= 0 && compareDates(fecha, rangoHasta) <= 0;

  const slotClass = (slot: SlotCalendario) => {
    const base = SLOT_COLORS[slot.tipo] || SLOT_COLORS.programada;
    return slot.fuera_horario ? `${base} ring-2 ring-amber-400 border-amber-400` : base;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Desde</label>
          <input
            type="date"
            value={rangoDesde}
            onChange={(e) => handleRangoDesde(e.target.value)}
            className="text-sm px-2 py-1.5 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hasta</label>
          <input
            type="date"
            value={rangoHasta}
            onChange={(e) => handleRangoHasta(e.target.value)}
            className="text-sm px-2 py-1.5 border rounded-lg"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['semana', 'mes'] as VistaCalendario[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setVista(v);
                setCursorFecha(v === 'mes' ? startOfMonth(cursorFecha) : clampDate(cursorFecha, rangoDesde, rangoHasta));
                setDiaSeleccionado(null);
              }}
              className={`px-3 py-1.5 text-xs font-bold capitalize ${vista === v ? 'text-white' : 'text-gray-600 bg-white'}`}
              style={vista === v ? { backgroundColor: PRIMARY } : undefined}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-end gap-1 ml-auto">
          <p className="text-xs font-semibold text-gray-600">{tituloVentana}</p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!puedeRetroceder}
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              onClick={irHoy}
              className="px-3 py-1.5 rounded-lg border text-xs font-bold text-fuchsia-900"
            >
              Hoy
            </button>
            <button
              type="button"
              disabled={!puedeAvanzar}
              onClick={() => navigate(1)}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {compareDates(rangoDesde, rangoHasta) > 0 && (
        <p className="text-sm text-red-600">La fecha «Desde» no puede ser posterior a «Hasta».</p>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { l: 'Total', v: stats.total, c: '#612853' },
            { l: 'Realizadas', v: stats.realizadas, c: '#6B7280' },
            { l: 'Programadas', v: stats.programadas, c: '#2563EB' },
            { l: 'En atención', v: stats.en_atencion, c: '#EA580C' },
            { l: 'Canceladas', v: stats.canceladas, c: '#DC2626' },
            { l: 'Reprogramadas', v: stats.reprogramadas, c: '#9333EA' },
            { l: 'No asist. pac.', v: stats.no_asistio_paciente, c: '#D97706' },
            { l: 'Libres', v: stats.slots_libres, c: '#059669' },
          ].map((k) => (
            <div key={k.l} className="bg-white rounded-xl border border-gray-100 p-2 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase">{k.l}</p>
              <p className="text-lg font-extrabold" style={{ color: k.c }}>{k.v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              filtro === f.id ? 'text-white border-fuchsia-900' : 'text-gray-600 border-gray-200'
            }`}
            style={filtro === f.id ? { backgroundColor: PRIMARY } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div
            className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-8 animate-spin"
            style={{ borderTopColor: PRIMARY }}
          />
        </div>
      )}

      {!isLoading && vista === 'semana' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {semanaDias.map((fecha) => {
            const dia = diasMap.get(fecha);
            const fueraRango = !enRango(fecha);
            const esHoy = fecha === hoy;
            return (
              <div
                key={fecha}
                className={`rounded-xl border p-2 min-h-[200px] flex flex-col ${
                  fueraRango ? 'bg-gray-50 border-dashed opacity-60' : 'bg-white border-gray-100'
                } ${esHoy ? 'ring-2 ring-fuchsia-300' : ''}`}
              >
                <button
                  type="button"
                  disabled={fueraRango}
                  onClick={() => setDiaSeleccionado(fecha)}
                  className="text-left mb-2 pb-2 border-b border-gray-100"
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    {parseDate(fecha).toLocaleDateString('es-PE', { weekday: 'short' })}
                  </p>
                  <p className="text-sm font-extrabold text-gray-900">
                    {parseDate(fecha).getDate()}/{parseDate(fecha).getMonth() + 1}
                  </p>
                </button>
                {fueraRango ? (
                  <p className="text-[10px] text-gray-400 text-center mt-4">Fuera del rango</p>
                ) : !dia ? (
                  <p className="text-[10px] text-gray-400 text-center mt-4">Sin datos</p>
                ) : !dia.es_laborable ? (
                  <p className="text-xs text-amber-700 text-center">{dia.motivo_no_laborable || 'No laborable'}</p>
                ) : dia.slots.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center">Sin horarios</p>
                ) : (
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-64">
                    {dia.slots.map((slot) => (
                      <button
                        key={`${slot.tipo}-${slot.hora_inicio}-${slot.cita_id ?? 'l'}`}
                        type="button"
                        onClick={() => handleSlotClick(fecha, slot)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg border text-[10px] font-semibold ${slotClass(slot)}`}
                      >
                        <span>{slot.hora_inicio}–{slot.hora_fin}</span>
                        {slot.fuera_horario && (
                          <span className="block text-amber-800 text-[9px]">Fuera de horario actual</span>
                        )}
                        {slot.paciente_nombre && (
                          <span className="block truncate">{slot.paciente_nombre}</span>
                        )}
                        {slot.tipo === 'libre' && slot.medicos_disponibles.length > 0 && (
                          <span className="block text-emerald-700">
                            {slot.medicos_disponibles.length} médico(s)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && vista === 'mes' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {mesCalendario.cells.map((cell, i) => {
              if (!cell.fecha) {
                return <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50 rounded-lg" />;
              }
              const dia = diasMap.get(cell.fecha);
              const fueraRango = !enRango(cell.fecha);
              const esHoy = cell.fecha === hoy;
              const seleccionado = cell.fecha === diaSeleccionado;
              return (
                <button
                  key={cell.fecha}
                  type="button"
                  disabled={fueraRango}
                  onClick={() => setDiaSeleccionado(cell.fecha!)}
                  className={`min-h-[80px] p-2 rounded-lg border text-left transition-colors ${
                    fueraRango
                      ? 'bg-gray-50 border-dashed text-gray-300 cursor-not-allowed'
                      : seleccionado
                        ? 'ring-2 ring-fuchsia-900 bg-fuchsia-50 border-fuchsia-200'
                        : dia && !dia.es_laborable
                          ? 'bg-amber-50 border-amber-100'
                          : 'bg-white border-gray-100 hover:bg-gray-50'
                  } ${esHoy && !fueraRango ? 'ring-1 ring-fuchsia-400' : ''}`}
                >
                  <span className={`text-sm font-bold ${fueraRango ? 'text-gray-300' : 'text-gray-900'}`}>
                    {parseDate(cell.fecha).getDate()}
                  </span>
                  {!fueraRango && dia && (
                    <>
                      {!dia.es_laborable ? (
                        <span className="block text-[9px] text-amber-700 leading-tight mt-1">Cerrado</span>
                      ) : (
                        <span className="block text-[9px] text-gray-500 leading-tight mt-1">
                          <span className="text-emerald-600">{dia.total_libres}L</span>
                          {' · '}
                          <span className="text-blue-600">{dia.total_ocupados}O</span>
                        </span>
                      )}
                    </>
                  )}
                  {fueraRango && (
                    <span className="block text-[8px] text-gray-300 mt-1">—</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {vista === 'mes' && diaSeleccionado && enRango(diaSeleccionado) && (
        <div className="bg-white rounded-xl border p-4">
          <h4 className="font-bold text-gray-900 mb-3">
            {parseDate(diaSeleccionado).toLocaleDateString('es-PE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h4>
          {!diaDetalle ? (
            <p className="text-sm text-gray-500">Cargando detalle del día…</p>
          ) : !diaDetalle.es_laborable ? (
            <p className="text-sm text-amber-700">{diaDetalle.motivo_no_laborable || 'Día no laborable'}</p>
          ) : diaDetalle.slots.length === 0 ? (
            <p className="text-sm text-gray-500">No hay horarios para este día.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              {diaDetalle.slots.map((slot) => (
                <button
                  key={`${slot.tipo}-${slot.hora_inicio}-${slot.cita_id ?? 'l'}`}
                  type="button"
                  onClick={() => handleSlotClick(diaSeleccionado, slot)}
                  className={`px-2 py-2 rounded-lg border text-xs font-semibold text-left ${slotClass(slot)}`}
                >
                  {slot.hora_inicio}–{slot.hora_fin}
                  {slot.fuera_horario && (
                    <span className="block text-[9px] text-amber-800 font-normal">Fuera de horario</span>
                  )}
                  {slot.paciente_nombre && (
                    <span className="block truncate font-normal">{slot.paciente_nombre}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
