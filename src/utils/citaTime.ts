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
