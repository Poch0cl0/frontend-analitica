import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import {
  getDashboardAnalytics,
  type AnalyticsGranularidad,
  type DashboardAnalytics,
} from '../../services/api';
import {
  defaultAnalyticsRange,
  fillSeries,
  formatAnalyticsPeriodo,
  generateAllPeriods,
  xAxisInterval,
} from '../../utils/analyticsTimeSeries';
import { PRIMARY } from '../../constants/theme';

const CHART_COLOR = '#612853';
const CHART_HEIGHT = 480;

type ChartView =
  | 'citas'
  | 'riesgo'
  | 'pacientes'
  | 'usuarios_rol'
  | 'riesgo_distribucion';

const CHART_VIEWS: { id: ChartView; label: string; icon: typeof BarChart3 }[] = [
  { id: 'citas', label: 'Citas en el tiempo', icon: BarChart3 },
  { id: 'riesgo', label: 'Riesgo en el tiempo', icon: BarChart3 },
  { id: 'pacientes', label: 'Pacientes nuevos', icon: LineChartIcon },
  { id: 'usuarios_rol', label: 'Usuarios por rol', icon: PieChartIcon },
  { id: 'riesgo_distribucion', label: 'Distribución de riesgo', icon: PieChartIcon },
];

const RIESGO_COLORS: Record<string, string> = {
  bajo: '#10b981',
  medio: '#f59e0b',
  alto: '#f97316',
  critico: '#dc2626',
};

const CITA_COLORS: Record<string, string> = {
  cumplida: '#6b7280',
  programada: '#2563eb',
  en_atencion: '#ea580c',
  cancelada: '#dc2626',
  reprogramada: '#9333ea',
  no_asistio_paciente: '#d97706',
  no_asistio_medico: '#e11d48',
};

const CITA_SERIES: { key: string; label: string }[] = [
  { key: 'cumplida', label: 'Atendidas' },
  { key: 'programada', label: 'Programadas' },
  { key: 'en_atencion', label: 'En atención' },
  { key: 'cancelada', label: 'Canceladas' },
  { key: 'reprogramada', label: 'Reprogramadas' },
  { key: 'no_asistio_paciente', label: 'No asistió paciente' },
  { key: 'no_asistio_medico', label: 'No asistió médico' },
];

const RIESGO_SERIES: { key: string; label: string }[] = [
  { key: 'bajo', label: 'Bajo' },
  { key: 'medio', label: 'Medio' },
  { key: 'alto', label: 'Alto' },
  { key: 'critico', label: 'Crítico' },
];

const ROL_COLORS = ['#612853', '#CE7E9D', '#3b82f6', '#10b981', '#f59e0b'];

const EMPTY_CITA = {
  programada: 0,
  en_atencion: 0,
  cumplida: 0,
  cancelada: 0,
  reprogramada: 0,
  no_asistio_paciente: 0,
  no_asistio_medico: 0,
};

const EMPTY_RIESGO = { bajo: 0, medio: 0, alto: 0, critico: 0 };

const GRAN_LABELS: Record<AnalyticsGranularidad, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

function initialVisible<T extends string>(keys: T[]): Record<T, boolean> {
  return keys.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<T, boolean>);
}

interface SeriesToggleProps<T extends string> {
  series: { key: T; label: string }[];
  colors: Record<string, string>;
  visible: Record<T, boolean>;
  onToggle: (key: T) => void;
  onOnly: (key: T) => void;
  onAll: () => void;
}

function SeriesToggle<T extends string>({
  series,
  colors,
  visible,
  onToggle,
  onOnly,
  onAll,
}: SeriesToggleProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Mostrar:</span>
      <button
        type="button"
        onClick={onAll}
        className="px-2 py-1 rounded-lg text-[10px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
      >
        Todas
      </button>
      {series.map(({ key, label }) => {
        const on = visible[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            onDoubleClick={() => onOnly(key)}
            title="Doble clic para ver solo esta serie"
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
              on ? 'text-white border-transparent shadow-sm' : 'text-gray-400 border-gray-200 bg-white line-through'
            }`}
            style={on ? { backgroundColor: colors[key] } : undefined}
          >
            {label}
          </button>
        );
      })}
      <span className="text-[9px] text-gray-400 hidden sm:inline">Doble clic en una serie = solo esa</span>
    </div>
  );
}

export default function AdminAnalyticsPanel() {
  const [granularidad, setGranularidad] = useState<AnalyticsGranularidad>('month');
  const [rango, setRango] = useState(() => defaultAnalyticsRange('month'));
  const [chartView, setChartView] = useState<ChartView>('citas');
  const [visibleCitas, setVisibleCitas] = useState(() => initialVisible(CITA_SERIES.map((s) => s.key)));
  const [visibleRiesgo, setVisibleRiesgo] = useState(() => initialVisible(RIESGO_SERIES.map((s) => s.key)));
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardAnalytics(rango.desde, rango.hasta, granularidad);
      setData(result);
    } catch {
      setError('No se pudieron cargar las estadísticas');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rango.desde, rango.hasta, granularidad]);

  useEffect(() => { load(); }, [load]);

  const handleGranularidad = (g: AnalyticsGranularidad) => {
    setGranularidad(g);
    setRango(defaultAnalyticsRange(g));
  };

  const allPeriods = useMemo(
    () => generateAllPeriods(rango.desde, rango.hasta, granularidad),
    [rango.desde, rango.hasta, granularidad],
  );

  const citasChart = useMemo(() => {
    if (!data) return [];
    const filled = fillSeries(data.serie_citas, allPeriods, EMPTY_CITA, granularidad);
    return filled.map((row) => ({
      ...row,
      label: formatAnalyticsPeriodo(row.periodo, granularidad),
    }));
  }, [data, allPeriods, granularidad]);

  const riesgoChart = useMemo(() => {
    if (!data) return [];
    const filled = fillSeries(data.serie_riesgo, allPeriods, EMPTY_RIESGO, granularidad);
    return filled.map((row) => ({
      ...row,
      label: formatAnalyticsPeriodo(row.periodo, granularidad),
    }));
  }, [data, allPeriods, granularidad]);

  const pacientesChart = useMemo(() => {
    if (!data) return [];
    const filled = fillSeries(data.serie_pacientes_nuevos, allPeriods, { total: 0 }, granularidad);
    return filled.map((row) => ({
      ...row,
      label: formatAnalyticsPeriodo(row.periodo, granularidad),
    }));
  }, [data, allPeriods, granularidad]);

  const riesgoPie = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.riesgo_distribucion)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        key: name,
      }));
  }, [data]);

  const usuariosPie = useMemo(() => {
    if (!data) return [];
    return data.usuarios_por_rol.map((u) => ({ name: u.rol, value: u.total }));
  }, [data]);

  const toggleCita = (key: string) => {
    setVisibleCitas((v) => ({ ...v, [key]: !v[key as keyof typeof v] }));
  };
  const onlyCita = (key: string) => {
    setVisibleCitas(
      CITA_SERIES.reduce((acc, s) => ({ ...acc, [s.key]: s.key === key }), {} as Record<string, boolean>),
    );
  };
  const allCitas = () => setVisibleCitas(initialVisible(CITA_SERIES.map((s) => s.key)));

  const toggleRiesgo = (key: string) => {
    setVisibleRiesgo((v) => ({ ...v, [key]: !v[key as keyof typeof v] }));
  };
  const onlyRiesgo = (key: string) => {
    setVisibleRiesgo(
      RIESGO_SERIES.reduce((acc, s) => ({ ...acc, [s.key]: s.key === key }), {} as Record<string, boolean>),
    );
  };
  const allRiesgo = () => setVisibleRiesgo(initialVisible(RIESGO_SERIES.map((s) => s.key)));

  const activeCitaSeries = CITA_SERIES.filter((s) => visibleCitas[s.key]);
  const activeRiesgoSeries = RIESGO_SERIES.filter((s) => visibleRiesgo[s.key]);

  const xTickInterval = xAxisInterval(allPeriods.length);
  const xLabelAngle = allPeriods.length > 10 ? -45 : allPeriods.length > 6 ? -30 : 0;
  const chartBottomMargin = xLabelAngle !== 0 ? 72 : 16;

  const renderMainChart = () => {
    if (!data) return null;

    if (chartView === 'citas') {
      if (activeCitaSeries.length === 0 || allPeriods.length === 0) {
        return <EmptyChart message={activeCitaSeries.length === 0 ? 'Selecciona al menos una serie' : undefined} />;
      }
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={citasChart}
            margin={{ top: 8, right: 16, left: 0, bottom: chartBottomMargin }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={xTickInterval}
              angle={xLabelAngle}
              textAnchor={xLabelAngle !== 0 ? 'end' : 'middle'}
              height={xLabelAngle !== 0 ? 64 : 32}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {activeCitaSeries.map(({ key, label }) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="citas"
                fill={CITA_COLORS[key]}
                name={label}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartView === 'riesgo') {
      if (activeRiesgoSeries.length === 0 || allPeriods.length === 0) {
        return <EmptyChart message={activeRiesgoSeries.length === 0 ? 'Selecciona al menos un nivel' : 'Sin predicciones'} />;
      }
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={riesgoChart}
            margin={{ top: 8, right: 16, left: 0, bottom: chartBottomMargin }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={xTickInterval}
              angle={xLabelAngle}
              textAnchor={xLabelAngle !== 0 ? 'end' : 'middle'}
              height={xLabelAngle !== 0 ? 64 : 32}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {activeRiesgoSeries.map(({ key, label }) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="riesgo"
                fill={RIESGO_COLORS[key]}
                name={label}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartView === 'pacientes') {
      if (allPeriods.length === 0) return <EmptyChart />;
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={pacientesChart} margin={{ top: 8, right: 16, left: 0, bottom: chartBottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={xTickInterval}
              angle={xLabelAngle}
              textAnchor={xLabelAngle !== 0 ? 'end' : 'middle'}
              height={xLabelAngle !== 0 ? 64 : 32}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="total"
              stroke={CHART_COLOR}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Nuevas pacientes"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartView === 'usuarios_rol') {
      if (usuariosPie.length === 0) return <EmptyChart />;
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={usuariosPie}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={160}
              label={({ name, value, percent }) =>
                `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
            >
              {usuariosPie.map((_, i) => (
                <Cell key={i} fill={ROL_COLORS[i % ROL_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (riesgoPie.length === 0) return <EmptyChart message="Sin predicciones" />;
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <PieChart>
          <Pie
            data={riesgoPie}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={160}
            label={({ name, value, percent }) =>
              `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {riesgoPie.map((entry) => (
              <Cell key={entry.key} fill={RIESGO_COLORS[entry.key] || '#9ca3af'} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 flex justify-center min-h-[320px]">
        <div className="w-8 h-8 border-4 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Analítica del sistema</h2>
          <p className="text-sm text-gray-500 mt-1">
            Elige el gráfico, el período temporal y las series que deseas visualizar
          </p>
        </div>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { l: 'Usuarios', v: data.totales.total_usuarios, c: CHART_COLOR },
              { l: 'Pacientes', v: data.totales.total_pacientes, c: '#3b82f6' },
              { l: 'Atendidas', v: data.totales.citas_atendidas, c: '#6b7280' },
              { l: 'Canceladas', v: data.totales.citas_canceladas, c: '#dc2626' },
              { l: 'Reprogramadas', v: data.totales.citas_reprogramadas, c: '#9333ea' },
            ].map((k) => (
              <div key={k.l} className="bg-white rounded-xl border border-gray-100 p-2.5 text-center shadow-sm">
                <p className="text-[9px] font-bold text-gray-400 uppercase">{k.l}</p>
                <p className="text-xl font-extrabold mt-0.5" style={{ color: k.c }}>{k.v}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {CHART_VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setChartView(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                chartView === id
                  ? 'text-white border-transparent shadow-md'
                  : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'
              }`}
              style={chartView === id ? { backgroundColor: PRIMARY } : undefined}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border border-gray-100 p-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Agrupar por</p>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['day', 'week', 'month', 'year'] as AnalyticsGranularidad[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGranularidad(g)}
                  className={`px-3 py-1.5 text-xs font-bold ${
                    granularidad === g ? 'text-white' : 'text-gray-600 bg-white'
                  }`}
                  style={granularidad === g ? { backgroundColor: PRIMARY } : undefined}
                >
                  {GRAN_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Desde</p>
            <input
              type="date"
              value={rango.desde}
              onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
              className="text-sm px-2 py-1.5 border rounded-lg"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Hasta</p>
            <input
              type="date"
              value={rango.hasta}
              onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
              className="text-sm px-2 py-1.5 border rounded-lg"
            />
          </div>
          {loading && (
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
              <div className="w-4 h-4 border-2 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin" />
              Actualizando…
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {data && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <h3 className="text-base font-bold text-gray-800">
              {CHART_VIEWS.find((v) => v.id === chartView)?.label}
              <span className="text-gray-400 font-normal text-sm ml-2">
                · por {GRAN_LABELS[granularidad].toLowerCase()}
              </span>
            </h3>

            {chartView === 'citas' && (
              <SeriesToggle
                series={CITA_SERIES}
                colors={CITA_COLORS}
                visible={visibleCitas}
                onToggle={toggleCita}
                onOnly={onlyCita}
                onAll={allCitas}
              />
            )}

            {chartView === 'riesgo' && (
              <SeriesToggle
                series={RIESGO_SERIES}
                colors={RIESGO_COLORS}
                visible={visibleRiesgo}
                onToggle={toggleRiesgo}
                onOnly={onlyRiesgo}
                onAll={allRiesgo}
              />
            )}
          </div>

          <div className="p-4 sm:p-6 min-h-[520px]">
            {renderMainChart()}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyChart({ message = 'Sin datos en el período' }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-gray-400"
      style={{ height: CHART_HEIGHT }}
    >
      <BarChart3 className="w-12 h-12 mb-3 stroke-1" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
