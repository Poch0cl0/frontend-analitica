const LIMA_TZ = 'America/Lima';

/** Interpreta fecha_hora del API como hora de pared en Perú (sin zona en el string). */
function parseCitaLima(iso: string): Date {
  const base = iso.replace('Z', '').slice(0, 19);
  if (/[+-]\d{2}:\d{2}$/.test(iso)) return new Date(iso);
  return new Date(`${base}-05:00`);
}

function limaNowComparable(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: LIMA_TZ }).slice(0, 19);
}

/** La ausencia solo aplica cuando ya llegó la hora programada (hora Perú). */
export function citaPermiteAusencia(fechaHoraIso: string): boolean {
  const citaStr = fechaHoraIso.replace('Z', '').slice(0, 19);
  return citaStr <= limaNowComparable();
}

export function formatCitaFechaHora(fechaHoraIso: string): string {
  return parseCitaLima(fechaHoraIso).toLocaleString('es-PE', {
    timeZone: LIMA_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function limaNowMs(): number {
  const s = new Date().toLocaleString('sv-SE', { timeZone: LIMA_TZ }).slice(0, 19);
  return new Date(`${s.replace(' ', 'T')}-05:00`).getTime();
}

/** Próximas citas primero (más cercanas a ahora), luego pasadas (más recientes primero). */
export function sortCitasPorProximidad<T extends { fecha_hora: string }>(citas: T[]): T[] {
  const now = limaNowMs();
  return [...citas].sort((a, b) => {
    const ta = parseCitaLima(a.fecha_hora).getTime();
    const tb = parseCitaLima(b.fecha_hora).getTime();
    const aProxima = ta >= now;
    const bProxima = tb >= now;
    if (aProxima && bProxima) return ta - tb;
    if (aProxima !== bProxima) return aProxima ? -1 : 1;
    return tb - ta;
  });
}

/** Orden cronológico ascendente (la más temprana primero). */
export function sortCitasCronologico<T extends { fecha_hora: string }>(citas: T[]): T[] {
  return [...citas].sort(
    (a, b) => parseCitaLima(a.fecha_hora).getTime() - parseCitaLima(b.fecha_hora).getTime(),
  );
}
