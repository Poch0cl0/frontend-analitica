/** Fecha local YYYY-MM-DD sin desfase por timezone (evita toISOString). */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Índices JS getDay(): Dom=0 … Sáb=6. Evita toLocaleDateString(weekday) (en algunos Windows sale mal “Vie”). */
export const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
export const DIAS_SEMANA_LARGO = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;
/** Lun=0 … Dom=6 (ISO / backend). */
export const DIAS_SEMANA_CORTO_LUNES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
export const DIAS_SEMANA_LARGO_LUNES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export function weekdayShort(d: Date): string {
  return DIAS_SEMANA_CORTO[d.getDay()];
}

export function weekdayLong(d: Date): string {
  return DIAS_SEMANA_LARGO[d.getDay()];
}

/** API devuelve datetimes naive en hora de Lima (sin sufijo Z). */
function parseApiDateTime(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const hasTz = /[Zz]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed);
  const normalized = hasTz ? trimmed : `${trimmed.replace(/\.\d+$/, '')}-05:00`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

const LIMA_TZ_OPTS = { timeZone: 'America/Lima' } as const;

/** Fecha y hora para análisis, recomendaciones, triaje, etc. (no usar en ejes de gráficos). */
export function formatDateTime(iso: string | null | undefined, fallback = '—'): string {
  const d = parseApiDateTime(iso);
  if (!d) return fallback;
  return d.toLocaleString('es-PE', {
    ...LIMA_TZ_OPTS,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Fecha y hora con mes largo (fichas de recomendación). */
export function formatDateTimeLong(iso: string | null | undefined, fallback = 'Fecha no registrada'): string {
  const d = parseApiDateTime(iso);
  if (!d) return fallback;
  return d.toLocaleString('es-PE', {
    ...LIMA_TZ_OPTS,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Suma minutos a fecha+hora locales y devuelve ISO local (sin conversión UTC). */
export function addMinutesLocal(dateStr: string, timeStr: string, minutes: number): string {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  d.setMinutes(d.getMinutes() + minutes);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}:00`;
}
