import { useState, useEffect } from 'react';
import {
  getCitas,
  getCitaById,
  updateCita,
  deleteCita,
  changeCitaEstado,
} from '../../services/api';
import type {
  CitaResponseEnriquecida,
} from '../../services/api';

export default function CitasPage() {
  const [citas, setCitas] = useState<CitaResponseEnriquecida[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCitas = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getCitas();
      setCitas(data.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()));
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al cargar las citas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCitas();
  }, []);

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'programada': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'en_atencion': return 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse';
      case 'cumplida': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelada': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'programada': return 'Programada';
      case 'en_atencion': return 'En Atención';
      case 'cumplida': return 'Cumplida';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  const formatHour = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  if (isLoading) return <div className="p-8 text-center">Cargando citas...</div>;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Gestión de Citas</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3.5 px-5">Fecha</th>
              <th className="py-3.5 px-4">Hora</th>
              <th className="py-3.5 px-4">Paciente</th>
              <th className="py-3.5 px-4">Médico</th>
              <th className="py-3.5 px-4">Tipo de Cita</th>
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
                <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                  {formatHour(cita.fecha_hora)}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-gray-900 leading-tight">
                    {cita.paciente_nombre || 'Paciente no identificada'}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                  {cita.medico_nombre ? `Dr. ${cita.medico_nombre.split(' ')[0]}` : '--'}
                </td>
                <td className="py-3.5 px-4 text-gray-600 font-medium">
                  {cita.motivo || 'N/A'}
                </td>
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyles(cita.estado)}`}>
                    {getStatusLabel(cita.estado)}
                  </span>
                </td>
                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Placeholder for icons: Need to import icons if I want to use them */}
                    <button className="p-1.5 text-gray-500 hover:text-gray-900">Ver</button>
                    <button className="p-1.5 text-gray-500 hover:text-gray-900">Editar</button>
                    <button className="p-1.5 text-red-500 hover:text-red-700">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
