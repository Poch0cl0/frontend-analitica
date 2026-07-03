import type { CitaResponseEnriquecida } from '../../../services/api';
import { formatHour, getStatusBadgeStyles, getStatusLabel, isCitaCerrada } from '../citaUiUtils';
import { PRIMARY } from '../../../constants/theme';

interface CitasTableProps {
  citas: CitaResponseEnriquecida[];
  isDoctor: boolean;
  onDetail: (id: number) => void;
  onAtender: (cita: CitaResponseEnriquecida) => void;
  onEdit: (cita: CitaResponseEnriquecida) => void;
  onDelete: (id: number) => void;
}

export default function CitasTable({
  citas,
  isDoctor,
  onDetail,
  onAtender,
  onEdit,
  onDelete,
}: CitasTableProps) {
  if (citas.length === 0) {
    return <div className="p-12 text-center text-gray-500">No hay citas que coincidan con los filtros.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <th className="py-3.5 px-5">Fecha</th>
            <th className="py-3.5 px-4">Hora</th>
            <th className="py-3.5 px-4">Paciente</th>
            <th className="py-3.5 px-4">Médico</th>
            <th className="py-3.5 px-4">Duración</th>
            <th className="py-3.5 px-4">Estado</th>
            <th className="py-3.5 px-5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {citas.map((cita) => (
            <tr key={cita.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">
                {new Date(cita.fecha_hora).toLocaleDateString('es-ES')}
              </td>
              <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">{formatHour(cita.fecha_hora)}</td>
              <td className="py-3.5 px-4">
                <div className="font-semibold text-gray-900 leading-tight">
                  {cita.paciente_nombre || 'Paciente no identificada'}
                </div>
              </td>
              <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                {cita.medico_nombre ? `Dr. ${cita.medico_nombre.split(' ')[0]}` : '--'}
              </td>
              <td className="py-3.5 px-4 text-gray-600 font-medium">{cita.duracion_minutos} min</td>
              <td className="py-3.5 px-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyles(cita.estado)}`}>
                  {getStatusLabel(cita.estado)}
                </span>
              </td>
              <td className="py-3.5 px-5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDetail(cita.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Ver
                  </button>
                  {isDoctor ? (
                    (cita.estado === 'programada' || cita.estado === 'en_atencion') ? (
                      <button
                        type="button"
                        onClick={() => onAtender(cita)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                        style={{ backgroundColor: '#F5EDF2', color: PRIMARY, borderColor: '#E8D5EF' }}
                      >
                        Atender
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic px-2">
                        {cita.estado === 'cumplida' ? 'Atendida' : 'Cancelada'}
                      </span>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(cita)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                      >
                        {isCitaCerrada(cita.estado) ? 'Ver' : 'Editar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(cita.id)}
                        disabled={isCitaCerrada(cita.estado)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
