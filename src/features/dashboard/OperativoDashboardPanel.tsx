import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import {
  getCitas,
  getDashboardOperativo,
  getMedicos,
  type AnalyticsGranularidad,
  type CitaResponseEnriquecida,
  type DashboardOperativo,
  type MedicoResumen,
} from '../../services/api';
import { defaultAnalyticsRange, fillSeries, formatAnalyticsPeriodo, generateAllPeriods } from '../../utils/analyticsTimeSeries';
import { useUserRole } from '../../hooks/useUserRole';
import SearchableEntitySelect from '../../components/ui/SearchableEntitySelect';
import { formatCitaFechaHora, sortCitasPorProximidad } from '../../utils/citaTime';
import { getStatusBadgeStyles, getStatusLabel } from '../citas/citaUiUtils';

const CITA_COLORS: Record<string, string> = {
  cumplida: '#6b7280',
  programada: '#2563eb',
  en_atencion: '#ea580c',
  cancelada: '#dc2626',
  reprogramada: '#9333ea',
  no_asistio_paciente: '#d97706',
  no_asistio_medico: '#e11d48',
};

const ESTADOS_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: 'programada', label: 'Programadas' },
  { value: 'en_atencion', label: 'En atención' },
  { value: 'cumplida', label: 'Atendidas' },
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'reprogramada', label: 'Reprogramadas' },
  { value: 'no_asistio_paciente', label: 'No asistió paciente' },
  { value: 'no_asistio_medico', label: 'No asistió médico' },
];

const PAGE_SIZES = [10, 20, 50];

const AGENDA_COLORS = {
  slots_libres: '#64748b',
  slots_ocupados: '#0d9488',
};

const EMPTY_CITA = {
  programada: 0,
  en_atencion: 0,
  cumplida: 0,
  cancelada: 0,
  reprogramada: 0,
  no_asistio_paciente: 0,
  no_asistio_medico: 0,
  slots_libres: 0,
  slots_ocupados: 0,
};

function horaCita(iso: string): string {
  const base = iso.replace('Z', '').slice(11, 16);
  return base || '—';
}

export default function OperativoDashboardPanel() {
  const { isDoctor, isAdmin, isSecretary } = useUserRole();
  const [range, setRange] = useState(() => defaultAnalyticsRange('month'));
  const [granularidad, setGranularidad] = useState<AnalyticsGranularidad>('month');
  const [medicoId, setMedicoId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busquedaCita, setBusquedaCita] = useState('');
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [data, setData] = useState<DashboardOperativo | null>(null);
  const [citas, setCitas] = useState<CitaResponseEnriquecida[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCitas, setLoadingCitas] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const canFilterMedico = isAdmin || isSecretary;

  useEffect(() => {
    if (canFilterMedico) {
      getMedicos().then(setMedicos).catch(() => setMedicos([]));
    }
  }, [canFilterMedico]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboardOperativo(
        range.desde,
        range.hasta,
        granularidad,
        medicoId ? Number(medicoId) : undefined,
      );
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range.desde, range.hasta, granularidad, medicoId]);

  const loadCitas = useCallback(async () => {
    setLoadingCitas(true);
    try {
      const res = await getCitas(
        undefined,
        medicoId ? Number(medicoId) : undefined,
        filtroEstado || undefined,
        range.desde,
        range.hasta,
      );
      setCitas(sortCitasPorProximidad(res));
    } catch {
      setCitas([]);
    } finally {
      setLoadingCitas(false);
    }
  }, [range.desde, range.hasta, medicoId, filtroEstado]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCitas(); setPage(1); }, [loadCitas]);

  const handleGranularidadChange = (g: AnalyticsGranularidad) => {
    setGranularidad(g);
    setRange(defaultAnalyticsRange(g));
    setPage(1);
  };

  const allPeriods = useMemo(
    () => generateAllPeriods(range.desde, range.hasta, granularidad),
    [range.desde, range.hasta, granularidad],
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    const filled = fillSeries(data.serie_citas, allPeriods, EMPTY_CITA, granularidad);
    return filled.map((row) => ({
      periodo: formatAnalyticsPeriodo(row.periodo, granularidad),
      Atendidas: row.cumplida,
      Programadas: row.programada,
      'En atención': row.en_atencion,
      Canceladas: row.cancelada,
      Reprogramadas: row.reprogramada,
      'No asistió paciente': row.no_asistio_paciente,
      'No asistió médico': row.no_asistio_medico,
      'Horarios libres': row.slots_libres ?? 0,
      'Horarios ocupados': row.slots_ocupados ?? 0,
    }));
  }, [data, allPeriods, granularidad]);

  const citasFiltradas = useMemo(() => {
    const q = busquedaCita.trim().toLowerCase();
    if (!q) return citas;
    return citas.filter((c) => {
      const texto = `${c.paciente_nombre ?? ''} ${c.paciente_dni ?? ''} ${c.medico_nombre ?? ''}`.toLowerCase();
      return texto.includes(q);
    });
  }, [citas, busquedaCita]);

  const totalPages = Math.max(1, Math.ceil(citasFiltradas.length / pageSize));
  const citasPagina = useMemo(() => {
    const start = (page - 1) * pageSize;
    return citasFiltradas.slice(start, start + pageSize);
  }, [citasFiltradas, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const title = isDoctor
    ? 'Mi agenda y ocupación'
    : isSecretary
      ? 'Indicadores operativos de citas'
      : 'Indicadores operativos';

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin" />
      </div>
    );
  }

  const k = data?.kpis;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Citas, ocupación y tendencias por período</p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Desde</label>
            <input type="date" value={range.desde} onChange={(e) => setRange((r) => ({ ...r, desde: e.target.value }))}
              className="text-xs px-2 py-1.5 border rounded-lg" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hasta</label>
            <input type="date" value={range.hasta} onChange={(e) => setRange((r) => ({ ...r, hasta: e.target.value }))}
              className="text-xs px-2 py-1.5 border rounded-lg" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Agrupar</label>
            <select value={granularidad} onChange={(e) => handleGranularidadChange(e.target.value as AnalyticsGranularidad)}
              className="text-xs px-2 py-1.5 border rounded-lg">
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </div>
          {canFilterMedico && (
            <div className="min-w-[200px]">
              <SearchableEntitySelect
                mode="medico"
                label="Médico"
                value={medicoId}
                onChange={setMedicoId}
                medicos={medicos}
                placeholder="Todos los médicos"
              />
            </div>
          )}
        </div>
      </div>

      {k && (
        <div className="px-6 pt-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Resumen del período</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Pacientes activos', value: k.total_pacientes, accent: null },
                { label: 'Atendidas', value: k.realizadas, accent: CITA_COLORS.cumplida },
                { label: 'Pendientes', value: k.pendientes, accent: null },
                { label: 'Canceladas', value: k.canceladas, accent: CITA_COLORS.cancelada },
                { label: 'Reprogramadas', value: k.reprogramadas, accent: CITA_COLORS.reprogramada },
                { label: 'Ocupación agenda', value: `${k.nivel_ocupacion}%`, accent: null },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-gray-50 border border-gray-100 p-3"
                  style={item.accent ? { borderLeftWidth: 3, borderLeftColor: item.accent } : undefined}
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{item.label}</p>
                  <p className="text-2xl font-extrabold mt-1 text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Capacidad de agenda y ausencias (totales del período)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Horarios libres', value: k.slots_libres, hint: 'Slots disponibles' },
                { label: 'Horarios ocupados', value: k.slots_ocupados, hint: 'Slots con cita' },
                { label: 'No asistió paciente', value: k.no_asistio_paciente, hint: 'Ausencia paciente' },
                { label: 'No asistió médico', value: k.no_asistio_medico, hint: 'Ausencia médico' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">{item.label}</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{item.value}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="px-6 pt-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Citas y agenda en el tiempo</p>
          <p className="text-[10px] text-gray-400 mb-2">Barras: estados de cita · Líneas (eje derecho): horarios libres y ocupados</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className={`px-6 pb-4 h-96 relative transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="citas" tick={{ fontSize: 10 }} allowDecimals={false} width={36} />
              <YAxis yAxisId="agenda" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false} width={40} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="citas" dataKey="Atendidas" stackId="citas" fill={CITA_COLORS.cumplida} />
              <Bar yAxisId="citas" dataKey="Programadas" stackId="citas" fill={CITA_COLORS.programada} />
              <Bar yAxisId="citas" dataKey="En atención" stackId="citas" fill={CITA_COLORS.en_atencion} />
              <Bar yAxisId="citas" dataKey="Canceladas" stackId="citas" fill={CITA_COLORS.cancelada} />
              <Bar yAxisId="citas" dataKey="Reprogramadas" stackId="citas" fill={CITA_COLORS.reprogramada} />
              <Bar yAxisId="citas" dataKey="No asistió paciente" stackId="citas" fill={CITA_COLORS.no_asistio_paciente} />
              <Bar yAxisId="citas" dataKey="No asistió médico" stackId="citas" fill={CITA_COLORS.no_asistio_medico} />
              <Line yAxisId="agenda" type="monotone" dataKey="Horarios libres" stroke={AGENDA_COLORS.slots_libres} strokeWidth={2} dot={false} />
              <Line yAxisId="agenda" type="monotone" dataKey="Horarios ocupados" stroke={AGENDA_COLORS.slots_ocupados} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && chartData.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Sin citas en el período seleccionado.</p>
      )}

      <div className="px-6 pb-6 border-t border-gray-100 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Detalle de citas del período</h4>
            <p className="text-[10px] text-gray-500">{citasFiltradas.length} registro(s)</p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar</label>
              <input
                type="search"
                value={busquedaCita}
                onChange={(e) => { setBusquedaCita(e.target.value); setPage(1); }}
                placeholder="Paciente, DNI o médico"
                className="text-xs px-2 py-1.5 border rounded-lg min-w-[180px]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 border rounded-lg"
              >
                {ESTADOS_FILTRO.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadingCitas ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin" />
          </div>
        ) : citasPagina.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay citas que coincidan con los filtros.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Fecha y hora</th>
                    {!isDoctor && <th className="py-3 px-4">Médico</th>}
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Duración</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {citasPagina.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 text-gray-800">
                        <span className="font-medium">{formatCitaFechaHora(c.fecha_hora)}</span>
                        <span className="text-[10px] text-gray-400 block">
                          {horaCita(c.fecha_hora)} – {c.fecha_hora_fin ? horaCita(c.fecha_hora_fin) : `${c.duracion_minutos} min`}
                        </span>
                      </td>
                      {!isDoctor && (
                        <td className="py-3 px-4 text-gray-600">{c.medico_nombre ?? '—'}</td>
                      )}
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{c.paciente_nombre ?? '—'}</span>
                        {c.paciente_dni && (
                          <span className="text-[10px] text-gray-400 block">DNI {c.paciente_dni}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.duracion_minutos} min</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeStyles(c.estado)}`}>
                          {getStatusLabel(c.estado)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Mostrar</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1 border rounded-lg"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>por página</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs font-semibold border rounded-lg disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-600">
                  Página {page} de {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-semibold border rounded-lg disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
