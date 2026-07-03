import { formatDateTime } from './date';

export type PrediccionTrendGranularity = 'hour' | 'day' | 'month' | 'year';

export const PREDICCION_TREND_GRANULARITY_OPTIONS: { value: PrediccionTrendGranularity; label: string }[] = [
  { value: 'hour', label: 'Por hora' },
  { value: 'day', label: 'Por día' },
  { value: 'month', label: 'Por mes' },
  { value: 'year', label: 'Por año' },
];

interface TrendHistorialItem {
  id: number;
  fecha_prediccion: string;
  prob_consenso: number | null;
  nivel_riesgo?: string | null;
}

export function trendBucketKey(fechaIso: string, gran: PrediccionTrendGranularity): string {
  const d = new Date(fechaIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  if (gran === 'year') return String(y);
  if (gran === 'month') return `${y}-${m}`;
  if (gran === 'day') return `${y}-${m}-${day}`;
  return `${y}-${m}-${day}T${h}`;
}

/** Agrupa el historial: en cada período se muestra el análisis más reciente. */
export function aggregateHistorialForTrend<T extends TrendHistorialItem>(
  historial: T[],
  gran: PrediccionTrendGranularity,
): T[] {
  const valid = historial.filter((h) => h.prob_consenso != null);
  const byBucket = new Map<string, T>();

  for (const item of valid) {
    const key = trendBucketKey(item.fecha_prediccion, gran);
    const prev = byBucket.get(key);
    if (!prev || new Date(item.fecha_prediccion).getTime() > new Date(prev.fecha_prediccion).getTime()) {
      byBucket.set(key, item);
    }
  }

  return [...byBucket.values()].sort(
    (a, b) => new Date(a.fecha_prediccion).getTime() - new Date(b.fecha_prediccion).getTime(),
  );
}

export function formatTrendBucketLabel(bucketKey: string, gran: PrediccionTrendGranularity): string {
  if (gran === 'year') return bucketKey;

  if (gran === 'month') {
    const [y, m] = bucketKey.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
  }

  if (gran === 'day') {
    const d = new Date(`${bucketKey}T12:00:00`);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }

  const [datePart, hourPart] = bucketKey.split('T');
  const d = new Date(`${datePart}T${hourPart}:00:00`);
  const dayLabel = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  const timeLabel = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return `${dayLabel} ${timeLabel}`;
}

export function formatPrediccionTrendTooltip(fechaIso: string): string {
  return formatDateTime(fechaIso);
}
