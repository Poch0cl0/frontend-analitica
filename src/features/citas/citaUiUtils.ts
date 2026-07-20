export function isCitaCerrada(estado: string) {
  return ['cumplida', 'cancelada', 'reprogramada', 'no_asistio_paciente', 'no_asistio_medico'].includes(estado);
}

export function getStatusBadgeStyles(status: string) {
  switch (status) {
    case 'programada': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'en_atencion': return 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse';
    case 'cumplida': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelada': return 'bg-red-50 text-red-700 border-red-200';
    case 'reprogramada': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'no_asistio_paciente': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'no_asistio_medico': return 'bg-rose-50 text-rose-800 border-rose-200';
    default: return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'programada': return 'Programada';
    case 'en_atencion': return 'En Atención';
    case 'cumplida': return 'Cumplida';
    case 'cancelada': return 'Cancelada';
    case 'reprogramada': return 'Reprogramada';
    case 'no_asistio_paciente': return 'No asistió paciente';
    case 'no_asistio_medico': return 'No asistió médico';
    default: return status.replace(/_/g, ' ');
  }
}

export function getRiskBadgeStyles(risk: string | null | undefined) {
  const normalized = (risk || '').toLowerCase().trim();
  switch (normalized) {
    case 'bajo': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'medio': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'alto': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'critico':
    case 'crítico': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

export function formatHour(isoStr: string) {
  try {
    const dt = new Date(isoStr);
    return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export function formatFullDate(isoStr: string) {
  try {
    const dt = new Date(isoStr);
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const hora = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dias[dt.getDay()]}, ${dt.getDate()} de ${meses[dt.getMonth()]} de ${dt.getFullYear()}, ${hora}`;
  } catch {
    return isoStr;
  }
}
