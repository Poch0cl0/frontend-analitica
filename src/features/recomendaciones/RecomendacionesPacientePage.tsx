import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getRecomendacionesPaciente, getPacienteById } from '../../services/api';
import type { RecomendacionResponse, PacienteResponse } from '../../services/api';

const PRIMARY = '#612853';

export default function RecomendacionesPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!pacienteId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [pac, recs] = await Promise.all([
          getPacienteById(Number(pacienteId)),
          getRecomendacionesPaciente(Number(pacienteId)),
        ]);
        setPaciente(pac);
        setRecomendaciones(recs);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [pacienteId]);

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/triaje')}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          ←
        </button>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recomendaciones clínicas</p>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Paciente'}
          </h1>
          {paciente && <p className="text-sm text-gray-500">DNI {paciente.dni}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Cargando recomendaciones...</div>
      ) : recomendaciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3">
          <p className="text-gray-600 font-medium">No hay recomendaciones registradas para esta paciente.</p>
          <p className="text-xs text-gray-400">Ejecute el módulo S-4 o complete una consulta con datos clínicos actualizados.</p>
          <Link to={`/pacientes/${pacienteId}`} className="inline-block py-2.5 px-5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PRIMARY }}>
            Ver ficha del paciente
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recomendaciones.map(rec => (
            <div key={rec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">{rec.titulo || rec.intervencion.nombre}</h2>
                  <p className="text-xs text-gray-500">{rec.intervencion.categoria || rec.intervencion.codigo}</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-100 uppercase">
                  {rec.estado}
                </span>
              </div>
              {rec.descripcion && (
                <p className="text-sm text-gray-700 leading-relaxed">{rec.descripcion}</p>
              )}
              {rec.notas && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">{rec.notas}</p>
              )}
              <p className="text-[10px] text-gray-400">
                {new Date(rec.fecha_recomendacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
