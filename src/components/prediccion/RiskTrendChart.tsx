import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { PrediccionHistorialItem } from '../../services/api';
import {
  aggregateHistorialForTrend,
  formatPrediccionTrendTooltip,
  formatTrendBucketLabel,
  PREDICCION_TREND_GRANULARITY_OPTIONS,
  trendBucketKey,
  type PrediccionTrendGranularity,
} from '../../utils/prediccionTrend';

function riskColor(nivel: string | null | undefined): string {
  switch (nivel?.toLowerCase()) {
    case 'critico':
    case 'crítico':
    case 'alto':
      return '#BA1A1A';
    case 'medio':
      return '#CA8A04';
    case 'bajo':
      return '#16A34A';
    default:
      return '#612853';
  }
}

interface RiskTrendChartProps {
  historial: PrediccionHistorialItem[];
}

export default function RiskTrendChart({ historial }: RiskTrendChartProps) {
  const [granularity, setGranularity] = useState<PrediccionTrendGranularity>('day');

  const totalAnalisis = useMemo(
    () => historial.filter((h) => h.prob_consenso != null).length,
    [historial],
  );

  const series = useMemo(
    () => aggregateHistorialForTrend(historial, granularity),
    [historial, granularity],
  );

  if (totalAnalisis === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
        <p className="text-sm text-slate-500">Sin historial de predicciones para mostrar tendencia.</p>
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = series.map((h, i) => {
    const x = padL + (series.length === 1 ? chartW / 2 : (i / (series.length - 1)) * chartW);
    const y = padT + chartH - Number(h.prob_consenso) * chartH;
    const bucket = trendBucketKey(h.fecha_prediccion, granularity);
    return { x, y, h, label: formatTrendBucketLabel(bucket, granularity) };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#612853]" />
        <h3 className="font-extrabold text-slate-800 text-sm">Tendencia de Riesgo Prematuro</h3>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Agrupar</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as PrediccionTrendGranularity)}
            className="text-[10px] px-2 py-1.5 border border-gray-200 rounded-lg bg-white"
          >
            {PREDICCION_TREND_GRANULARITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-[10px] text-slate-400">
            {series.length} punto{series.length !== 1 ? 's' : ''} · {totalAnalisis} análisis
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = padT + chartH - (pct / 100) * chartH;
          return (
            <g key={pct}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">
                {pct}%
              </text>
            </g>
          );
        })}
        {points.length >= 2 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#612853"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((p) => (
          <g key={p.h.id}>
            <title>{formatPrediccionTrendTooltip(p.h.fecha_prediccion)}</title>
            <circle cx={p.x} cy={p.y} r="5" fill={riskColor(p.h.nivel_riesgo)} stroke="white" strokeWidth="2" />
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize="8" fill="#94A3B8" fontWeight="600">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-[10px] text-slate-400 font-medium mt-2 text-center">
        Si hay varios análisis en el mismo período, se muestra el más reciente. Pase el cursor sobre un punto para ver fecha y hora exactas.
      </p>
    </div>
  );
}
