import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar,
} from 'recharts';
import { GitCompare } from 'lucide-react';
import {
  getComparativaEstadisticas,
  getMedicos,
  type ComparativaEstadisticasResponse,
  type FeedbackModeloFiltro,
  type MedicoResumen,
} from '../../services/api';
import {
  FEEDBACK_ASPECTO_OPTIONS,
  FEEDBACK_MODELO_OPTIONS,
  modeloFeedbackLabel,
} from './feedbackLabels';
import { useUserRole } from '../../hooks/useUserRole';

const CHART_COLOR = '#0369a1';

interface ComparativaAnalyticsPanelProps {
  compact?: boolean;
}

export default function ComparativaAnalyticsPanel({ compact = false }: ComparativaAnalyticsPanelProps) {
  const { isAdmin, isDoctor } = useUserRole();
  const [data, setData] = useState<ComparativaEstadisticasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [alcance, setAlcance] = useState<'global' | 'propio'>('global');
  const [aspecto, setAspecto] = useState<'probabilidad' | 'semanas'>('probabilidad');
  const [modelo, setModelo] = useState<FeedbackModeloFiltro>('consenso');
  const [medicoId, setMedicoId] = useState('');
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);

  useEffect(() => {
    if (isAdmin) getMedicos().then(setMedicos).catch(() => setMedicos([]));
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getComparativaEstadisticas({
        alcance: isDoctor ? alcance : 'global',
        medicoId: isAdmin && medicoId ? Number(medicoId) : undefined,
        aspecto,
        modelo,
      });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [alcance, aspecto, modelo, medicoId, isAdmin, isDoctor]);

  useEffect(() => {
    load();
  }, [load]);

  const alcanceLabel = useMemo(() => {
    if (isAdmin && medicoId) {
      const m = medicos.find((x) => String(x.id) === medicoId);
      return m ? `Dr. ${m.nombre} ${m.apellidos}` : 'Médico seleccionado';
    }
    if (isDoctor && alcance === 'propio') return 'Mis dictámenes';
    return 'General — todos los médicos';
  }, [isAdmin, isDoctor, medicoId, medicos, alcance]);

  const unidad = aspecto === 'probabilidad' ? '%' : ' sem';
  const chartData = data?.temporal ?? [];
  const chartHeight = compact ? 220 : 320;

  const diffBarData = data ? [
    { name: 'Modelo–Médico', valor: data.diff_promedio_modelo_medico },
    ...(data.diff_promedio_medico_real != null
      ? [{ name: 'Médico–Real', valor: data.diff_promedio_medico_real }]
      : []),
    ...(data.diff_promedio_modelo_real != null
      ? [{ name: 'Modelo–Real', valor: data.diff_promedio_modelo_real }]
      : []),
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {!compact && (
          <p className="text-xs text-gray-500">
            Compara lo que predice el modelo, el dictamen del médico y el resultado real.
          </p>
        )}
        <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wide">
          {alcanceLabel} · {modeloFeedbackLabel(modelo)} · {aspecto === 'probabilidad' ? 'Probabilidad' : 'Semanas'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {isDoctor && !isAdmin && (
          <select value={alcance} onChange={(e) => setAlcance(e.target.value as 'global' | 'propio')}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white">
            <option value="global">General — todos</option>
            <option value="propio">Solo mis dictámenes</option>
          </select>
        )}
        {isAdmin && (
          <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white min-w-[180px]">
            <option value="">General — todos los médicos</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
            ))}
          </select>
        )}
        <select value={modelo} onChange={(e) => setModelo(e.target.value as FeedbackModeloFiltro)}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white">
          {FEEDBACK_MODELO_OPTIONS.filter((o) => o.value !== '').map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={aspecto} onChange={(e) => setAspecto(e.target.value as 'probabilidad' | 'semanas')}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white">
          {FEEDBACK_ASPECTO_OPTIONS.filter((o) => o.value !== '').map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-8 text-center">Cargando comparativa...</p>
      ) : !data || data.total_registros === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <GitCompare className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm font-medium text-gray-500">Sin dictámenes con estos filtros</p>
          <p className="text-xs text-center max-w-sm mt-1">
            El médico registra su dictamen en Expediente inteligente → Predicción de riesgo.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Registros" value={String(data.total_registros)} />
            <Kpi label="Prom. modelo" value={`${data.promedio_modelo}${unidad}`} />
            <Kpi label="Prom. médico" value={`${data.promedio_medico}${unidad}`} accent="sky" />
            <Kpi
              label="Prom. real"
              value={data.promedio_real != null ? `${data.promedio_real}${unidad}` : '—'}
              accent="emerald"
            />
            <Kpi label="Δ modelo–médico" value={`${data.diff_promedio_modelo_medico}${unidad}`} accent="amber" />
            <Kpi
              label="Δ médico–real"
              value={data.diff_promedio_medico_real != null ? `${data.diff_promedio_medico_real}${unidad}` : '—'}
              accent="amber"
            />
          </div>

          <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-2'} gap-4`}>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Tendencia: modelo vs médico vs real</h3>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="promedio_modelo" name="Modelo" stroke="#612853" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="promedio_medico" name="Médico" stroke={CHART_COLOR} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="promedio_real" name="Real" stroke="#16a34a" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {!compact && (
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Diferencia promedio (absoluta)</h3>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={diffBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#d97706" name={`Diferencia${unidad}`} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm ${compact ? '' : 'lg:col-span-2'}`}>
              <h3 className="text-sm font-bold text-gray-700 mb-3">Δ modelo–médico por semana</h3>
              <ResponsiveContainer width="100%" height={compact ? 180 : 240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="diff_modelo_medico" name="Diferencia" stroke="#d97706" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'sky' | 'emerald' | 'amber';
}) {
  const bg = accent === 'sky' ? 'bg-sky-50 border-sky-100' : accent === 'emerald' ? 'bg-emerald-50 border-emerald-100' : accent === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100';
  return (
    <div className={`rounded-xl p-3 border ${bg}`}>
      <p className="text-[9px] uppercase text-gray-400 font-bold">{label}</p>
      <p className="text-base font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
