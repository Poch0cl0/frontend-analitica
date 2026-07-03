import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import {
  getFeedbackEstadisticas,
  getMedicos,
  type FeedbackEstadisticasResponse,
  type FeedbackModeloFiltro,
  type MedicoResumen,
} from '../../services/api';
import {
  aspectoFeedbackLabel,
  FEEDBACK_ASPECTO_OPTIONS,
  FEEDBACK_MODELO_OPTIONS,
  modeloFeedbackLabel,
} from '../feedback/feedbackLabels';
import { useUserRole } from '../../hooks/useUserRole';

export default function FeedbackDashboardSummary() {
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

  useEffect(() => {
    load();
  }, [load]);

  const filas = data?.por_modelo_aspecto ?? [];
  const sinDatos = !loading && (!data || data.total_votos === 0);

  const alcanceLabel = useMemo(() => {
    if (isAdmin && medicoId) {
      const m = medicos.find((x) => String(x.id) === medicoId);
      return m ? `Dr. ${m.nombre} ${m.apellidos}` : 'Médico seleccionado';
    }
    if (isDoctor && alcance === 'propio') return 'Mis votos';
    return 'General — todos los médicos';
  }, [isAdmin, isDoctor, medicoId, medicos, alcance]);

  const filtrosActivos = [
    modelo ? FEEDBACK_MODELO_OPTIONS.find((o) => o.value === modelo)?.label : null,
    aspecto ? FEEDBACK_ASPECTO_OPTIONS.find((o) => o.value === aspecto)?.label : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-fuchsia-800" />
            <h3 className="text-sm font-bold text-gray-800">Precisión de modelos (votación médica)</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin
              ? 'Vista general o por médico. Filtre modelo y tipo (probabilidad / semanas).'
              : 'Votación de todos los médicos o solo la suya. Filtre modelo y tipo.'}
          </p>
          <p className="text-[10px] font-bold text-fuchsia-800 mt-1.5 uppercase tracking-wide">
            Viendo: {alcanceLabel}
            {filtrosActivos ? ` · ${filtrosActivos}` : ''}
          </p>
        </div>
        {data && data.total_votos > 0 && (
          <div className="text-right">
            <p className="text-2xl font-extrabold text-fuchsia-900">{(data.precision_global * 100).toFixed(1)}%</p>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">
              {data.total_correctos}/{data.total_votos} de acuerdo
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {isDoctor && !isAdmin && (
          <select
            value={alcance}
            onChange={(e) => setAlcance(e.target.value as 'global' | 'propio')}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="global">General — todos los médicos</option>
            <option value="propio">Solo mis votos</option>
          </select>
        )}
        {isAdmin && (
          <select
            value={medicoId}
            onChange={(e) => setMedicoId(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white min-w-[180px]"
          >
            <option value="">General — todos los médicos</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
            ))}
          </select>
        )}
        <select
          value={modelo}
          onChange={(e) => setModelo(e.target.value as typeof modelo)}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {FEEDBACK_MODELO_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={aspecto}
          onChange={(e) => setAspecto(e.target.value as typeof aspecto)}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {FEEDBACK_ASPECTO_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-4 text-center">Cargando métricas...</p>
      ) : sinDatos ? (
        <p className="text-xs text-gray-500">
          No hay votos con estos filtros. Califique predicciones desde el expediente inteligente.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-bold">Modelo</th>
                <th className="py-2 pr-3 font-bold">Tipo</th>
                <th className="py-2 pr-3 font-bold text-right">De acuerdo</th>
                <th className="py-2 font-bold text-right">Precisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.map((f) => (
                <tr key={`${f.modelo ?? 'consenso'}-${f.aspecto}`}>
                  <td className="py-2 pr-3 font-semibold text-gray-700">{modeloFeedbackLabel(f.modelo)}</td>
                  <td className="py-2 pr-3 text-gray-600">{aspectoFeedbackLabel(f.aspecto)}</td>
                  <td className="py-2 pr-3 text-right text-gray-600">{f.correctos}/{f.total}</td>
                  <td className="py-2 text-right font-bold text-fuchsia-900">{(f.precision * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/feedback" className="inline-block text-xs font-bold text-fuchsia-900 underline">
        Ver gráficos y detalle completo →
      </Link>
    </div>
  );
}
