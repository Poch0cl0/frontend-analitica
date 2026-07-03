import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { getFeedbackEstadisticas, getMedicos, type FeedbackEstadisticasResponse, type MedicoResumen } from '../../services/api';
import { ThumbsUp, ThumbsDown, BarChart3, TrendingUp } from 'lucide-react';
import { useUserRole } from '../../hooks/useUserRole';
import { aspectoFeedbackLabel, FEEDBACK_ASPECTO_OPTIONS, FEEDBACK_MODELO_OPTIONS, modeloFeedbackLabel } from './feedbackLabels';
import type { FeedbackModeloFiltro } from '../../services/api';

const CHART_COLOR = '#612853';

export default function VotacionAnalyticsPanel() {
  const { isAdmin, isDoctor } = useUserRole();
  const [data, setData] = useState<FeedbackEstadisticasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [alcance, setAlcance] = useState<'global' | 'propio'>('global');
  const [aspecto, setAspecto] = useState<'' | 'probabilidad' | 'semanas'>('');
  const [modelo, setModelo] = useState<'' | FeedbackModeloFiltro>('');
  const [medicoId, setMedicoId] = useState('');
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);

  useEffect(() => {
    if (isAdmin) getMedicos().then(setMedicos).catch(() => setMedicos([]));
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFeedbackEstadisticas({
        alcance: isDoctor ? alcance : 'global',
        medicoId: isAdmin && medicoId ? Number(medicoId) : undefined,
        aspecto: aspecto || undefined,
        modelo: modelo || undefined,
      });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [alcance, aspecto, modelo, medicoId, isAdmin, isDoctor]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.total_votos === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <BarChart3 className="w-16 h-16 mb-4 stroke-1" />
        <p className="text-lg font-semibold text-gray-500">Sin datos de votación</p>
        <p className="text-sm text-center max-w-md">
          Los médicos pueden calificar predicciones (sí/no) desde el expediente inteligente.
        </p>
      </div>
    );
  }

  const modeloData = data.por_modelo.map((m) => ({
    name: modeloFeedbackLabel(m.modelo),
    Correctos: m.correctos,
    Incorrectos: m.incorrectos,
    precision: +(m.precision * 100).toFixed(1),
  }));

  const detalleFilas = data.por_modelo_aspecto ?? [];
  const aspectoData = (data.por_aspecto ?? []).map((a) => ({
    name: a.aspecto === 'probabilidad' ? 'Probabilidad' : 'Semanas',
    precision: +(a.precision * 100).toFixed(1),
    total: a.total,
    correctos: a.correctos,
  }));
  const temporalData = data.temporal.map((t) => ({
    fecha: t.fecha,
    Precisión: +(t.precision * 100).toFixed(1),
    Votos: t.total,
  }));
  const pieData = [
    { name: 'De acuerdo (Sí)', value: data.total_correctos },
    { name: 'No de acuerdo (No)', value: data.total_incorrectos },
  ];
  const alcanceLabel = data.alcance === 'propio'
    ? 'Mis votos'
    : data.medico_id
      ? 'Médico seleccionado'
      : 'Todos los médicos';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-xs text-gray-500">
          Votos «de acuerdo» / total · {alcanceLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {isDoctor && !isAdmin && (
            <select value={alcance} onChange={(e) => setAlcance(e.target.value as 'global' | 'propio')}
              className="text-xs px-3 py-2 border rounded-lg">
              <option value="global">General — todos los médicos</option>
              <option value="propio">Solo mis votos</option>
            </select>
          )}
          {isAdmin && (
            <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)}
              className="text-xs px-3 py-2 border rounded-lg min-w-[160px]">
              <option value="">General — todos los médicos</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
              ))}
            </select>
          )}
          <select value={aspecto} onChange={(e) => setAspecto(e.target.value as typeof aspecto)}
            className="text-xs px-3 py-2 border rounded-lg">
            {FEEDBACK_ASPECTO_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={modelo} onChange={(e) => setModelo(e.target.value as typeof modelo)}
            className="text-xs px-3 py-2 border rounded-lg">
            {FEEDBACK_MODELO_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total votos</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{data.total_votos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">De acuerdo</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{data.total_correctos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">No de acuerdo</p>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-1">{data.total_incorrectos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-fuchsia-600" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Precisión</p>
          </div>
          <p className="text-3xl font-bold mt-1" style={{ color: CHART_COLOR }}>
            {(data.precision_global * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {detalleFilas.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Detalle por modelo y tipo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-4 font-bold">Modelo</th>
                    <th className="py-2 pr-4 font-bold">Tipo</th>
                    <th className="py-2 pr-4 font-bold text-right">Sí / total</th>
                    <th className="py-2 font-bold text-right">Precisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {detalleFilas.map((f) => (
                    <tr key={`${f.modelo ?? 'consenso'}-${f.aspecto}`}>
                      <td className="py-2.5 pr-4 font-semibold">{modeloFeedbackLabel(f.modelo)}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{aspectoFeedbackLabel(f.aspecto)}</td>
                      <td className="py-2.5 pr-4 text-right">{f.correctos}/{f.total}</td>
                      <td className="py-2.5 text-right font-bold" style={{ color: CHART_COLOR }}>
                        {(f.precision * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Por modelo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={modeloData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Correctos" fill="#10b981" />
              <Bar dataKey="Incorrectos" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {aspectoData.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Por tipo</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={aspectoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="precision" fill={CHART_COLOR} name="Precisión %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Distribución Sí / No</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Evolución semanal</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="Precisión" stroke={CHART_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
