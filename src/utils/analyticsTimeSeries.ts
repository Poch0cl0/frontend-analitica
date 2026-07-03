import type { AnalyticsGranularidad } from '../services/api';
import { formatLocalDate } from './date';

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  const diff = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfPeriod(d: Date, gran: AnalyticsGranularidad): Date {
  if (gran === 'year') return new Date(d.getFullYear(), 0, 1);
  if (gran === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (gran === 'week') return startOfWeekMonday(d);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function periodKey(d: Date, gran: AnalyticsGranularidad): string {
  if (gran === 'year') return String(d.getFullYear());
  if (gran === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (gran === 'week') {
    return formatLocalDate(startOfWeekMonday(d));
  }
  return formatLocalDate(d);
}

function advancePeriod(d: Date, gran: AnalyticsGranularidad): Date {
  const next = new Date(d);
  if (gran === 'year') {
    next.setFullYear(next.getFullYear() + 1);
  } else if (gran === 'month') {
    next.setMonth(next.getMonth() + 1);
  } else if (gran === 'week') {
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/** Todas las semanas (lunes) que tocan un mes calendario. */
function weeksInMonth(year: number, month: number): string[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const weeks: string[] = [];
  let monday = startOfWeekMonday(firstOfMonth);

  while (monday <= lastOfMonth) {
    weeks.push(formatLocalDate(monday));
    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
  }
  return weeks;
}

/** Semanas de cada mes entre desde y hasta (mes actual incluye semanas futuras vacías). */
function generateWeekPeriods(desde: string, hasta: string): string[] {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const start = parseDate(desde);
  const end = parseDate(hasta);
  const todayMonthStart = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const periods: string[] = [];
  let monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (monthCursor <= endMonth) {
    if (monthCursor > todayMonthStart) break;

    periods.push(...weeksInMonth(monthCursor.getFullYear(), monthCursor.getMonth()));
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  return [...new Set(periods)];
}

/** Todos los días del rango (incluye días futuros del mes para citas programadas). */
function generateDayPeriods(desde: string, hasta: string): string[] {
  const periods: string[] = [];
  let cursor = startOfPeriod(parseDate(desde), 'day');
  const end = parseDate(hasta);

  while (cursor <= end) {
    periods.push(periodKey(cursor, 'day'));
    cursor = advancePeriod(cursor, 'day');
  }

  return periods;
}

/** Todos los meses del rango (incluye meses futuros del año para citas programadas). */
function generateMonthPeriods(desde: string, hasta: string): string[] {
  const periods: string[] = [];
  let cursor = startOfPeriod(parseDate(desde), 'month');
  const end = startOfPeriod(parseDate(hasta), 'month');

  while (cursor <= end) {
    periods.push(periodKey(cursor, 'month'));
    cursor = advancePeriod(cursor, 'month');
  }

  return periods;
}

/** Todos los años del rango (incluye el año en curso completo para citas programadas). */
function generateYearPeriods(desde: string, hasta: string): string[] {
  const periods: string[] = [];
  let cursor = startOfPeriod(parseDate(desde), 'year');
  const end = startOfPeriod(parseDate(hasta), 'year');

  while (cursor <= end) {
    periods.push(periodKey(cursor, 'year'));
    cursor = advancePeriod(cursor, 'year');
  }

  return periods;
}

/** Genera todas las etiquetas de período entre desde y hasta. */
export function generateAllPeriods(
  desde: string,
  hasta: string,
  granularidad: AnalyticsGranularidad,
): string[] {
  if (granularidad === 'week') {
    return generateWeekPeriods(desde, hasta);
  }

  if (granularidad === 'day') {
    return generateDayPeriods(desde, hasta);
  }

  if (granularidad === 'month') {
    return generateMonthPeriods(desde, hasta);
  }

  if (granularidad === 'year') {
    return generateYearPeriods(desde, hasta);
  }

  return [];
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31);
}

export function defaultAnalyticsRange(granularidad: AnalyticsGranularidad): { desde: string; hasta: string } {
  const hoy = new Date();
  const desde = new Date(hoy);

  if (granularidad === 'day' || granularidad === 'week') {
    desde.setDate(1);
    return { desde: formatLocalDate(desde), hasta: formatLocalDate(endOfMonth(hoy)) };
  }

  if (granularidad === 'month') {
    desde.setMonth(0);
    desde.setDate(1);
    return { desde: formatLocalDate(desde), hasta: formatLocalDate(endOfYear(hoy)) };
  }

  desde.setFullYear(desde.getFullYear() - 4);
  desde.setMonth(0);
  desde.setDate(1);
  return { desde: formatLocalDate(desde), hasta: formatLocalDate(endOfYear(hoy)) };
}

export function normalizePeriodoKey(periodo: string, granularidad: AnalyticsGranularidad): string {
  if (granularidad === 'week') {
    return formatLocalDate(startOfWeekMonday(parseDate(periodo)));
  }
  if (granularidad === 'month') {
    return periodo.length >= 7 ? periodo.slice(0, 7) : periodo;
  }
  if (granularidad === 'day') {
    return periodo.length >= 10 ? periodo.slice(0, 10) : periodo;
  }
  if (granularidad === 'year') {
    return periodo.length >= 4 ? periodo.slice(0, 4) : periodo;
  }
  return periodo;
}

export function formatAnalyticsPeriodo(periodo: string, granularidad: AnalyticsGranularidad): string {
  if (granularidad === 'day') {
    const d = parseDate(periodo);
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }
  if (granularidad === 'week') {
    const d = parseDate(normalizePeriodoKey(periodo, 'week'));
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const labelStart = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const labelEnd = end.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    return `${labelStart} – ${labelEnd}`;
  }
  if (granularidad === 'month') {
    const [y, m] = periodo.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
  }
  return periodo;
}

export function fillSeries<T extends { periodo: string }>(
  serie: T[],
  periods: string[],
  emptyRow: Omit<T, 'periodo'>,
  granularidad: AnalyticsGranularidad = 'month',
): T[] {
  const map = new Map(
    serie.map((row) => [normalizePeriodoKey(row.periodo, granularidad), row]),
  );
  return periods.map((periodo) => {
    const key = normalizePeriodoKey(periodo, granularidad);
    const existing = map.get(key);
    if (existing) return { ...existing, periodo: key };
    return { periodo: key, ...emptyRow } as T;
  });
}

/** Calcula intervalo de etiquetas del eje X según cantidad de períodos. */
export function xAxisInterval(count: number): number | 'preserveStartEnd' {
  if (count <= 12) return 0;
  if (count <= 24) return 1;
  if (count <= 40) return 2;
  return Math.floor(count / 15);
}
