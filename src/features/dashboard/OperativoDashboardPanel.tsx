import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
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
import { defaultAnalyticsRange, formatAnalyticsPeriodo } from '../../utils/analyticsTimeSeries';
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

function horaCita(iso: string): string {
  const base = iso.replace('Z', '').slice(11, 16);
  return base || '—';
}

export default function OperativoDashboardPanel() {
  const { isDoctor, isAdmin, isSecretary } = useUserRole();
  const [range, setRange] = useState(defaultAnalyticsRange);
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

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.serie_citas.map((row) => ({
      periodo: formatAnalyticsPeriodo(row.periodo, granularidad),
      Atendidas: row.cumplida,
      Programadas: row.programada,
      'En atención': row.en_atencion,
      Canceladas: row.cancelada,
      Reprogramadas: row.reprogramada,
    }));
  }, [data, granularidad]);

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
            <select value={granularidad} onChange={(e) => setGranularidad(e.target.value as AnalyticsGranularidad)}
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
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Pacientes', value: k.total_pacientes, color: 'text-gray-900' },
            { label: 'Atendidas', value: k.realizadas, color: 'text-gray-700' },
            { label: 'Pendientes', value: k.pendientes, color: 'text-blue-700' },
            { label: 'Canceladas', value: k.canceladas, color: 'text-red-700' },
            { label: 'Reprogramadas', value: k.reprogramadas, color: 'text-purple-700' },
            { label: 'Ocupación', value: `${k.nivel_ocupacion}%`, color: 'text-fuchsia-800' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{item.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="text-[10px] text-emerald-700 font-semibold uppercase">Horarios libres</p>
          <p className="text-xl font-bold text-emerald-800">{k?.slots_libres ?? 0}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
          <p className="text-[10px] text-blue-700 font-semibold uppercase">Horarios ocupados</p>
          <p className="text-xl font-bold text-blue-800">{k?.slots_ocupados ?? 0}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-center">
          <p className="text-[10px] text-amber-700 font-semibold uppercase">No asistió paciente</p>
          <p className="text-xl font-bold text-amber-800">{k?.no_asistio_paciente ?? 0}</p>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-center">
          <p className="text-[10px] text-rose-700 font-semibold uppercase">No asistió médico</p>
          <p className="text-xl font-bold text-rose-800">{k?.no_asistio_medico ?? 0}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="p-6 pt-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Atendidas" stackId="a" fill={CITA_COLORS.cumplida} />
              <Bar dataKey="Programadas" stackId="a" fill={CITA_COLORS.programada} />
              <Bar dataKey="En atención" stackId="a" fill={CITA_COLORS.en_atencion} />
              <Bar dataKey="Canceladas" stackId="a" fill={CITA_COLORS.cancelada} />
              <Bar dataKey="Reprogramadas" stackId="a" fill={CITA_COLORS.reprogramada} />
            </BarChart>
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
