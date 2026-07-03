/** Fecha local YYYY-MM-DD sin desfase por timezone (evita toISOString). */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
