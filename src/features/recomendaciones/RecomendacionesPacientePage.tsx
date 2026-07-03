import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import {
  getRecomendacionesPaciente,
  getPacienteById,
  getUltimaPrediccion,
  ejecutarRecomendacionesS4,
} from '../../services/api';
import type { RecomendacionResponse, PacienteResponse } from '../../services/api';
import { getApiErrorMessage } from '../../services/client';

const PRIMARY = '#612853';

export default function RecomendacionesPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    if (!pacienteId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [pac, recs] = await Promise.all([
        getPacienteById(Number(pacienteId)),
        getRecomendacionesPaciente(Number(pacienteId)),
      ]);
      setPaciente(pac);
      setRecomendaciones(recs);
    } catch (err) {
      console.error(err);
      setErrorMsg(getApiErrorMessage(err, 'No se pudieron cargar las recomendaciones.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pacienteId]);

  const handleGenerarClick = async () => {
    if (!pacienteId) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const ultimaPred = await getUltimaPrediccion(Number(pacienteId));

      if (!ultimaPred?.prediccion_id) {
        setErrorMsg('No hay una predicción activa. Analice el riesgo del paciente primero.');
        return;
      }

      await ejecutarRecomendacionesS4(Number(pacienteId), ultimaPred.prediccion_id);
      const recsActualizadas = await getRecomendacionesPaciente(Number(pacienteId));
      setRecomendaciones(recsActualizadas);
    } catch (err) {
      console.error(err);
      setErrorMsg(getApiErrorMessage(err, 'Error al generar la recomendación.'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full space-y-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/recomendaciones')}
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

        <button
          type="button"
          onClick={handleGenerarClick}
          disabled={isGenerating || isLoading}
          className="py-2.5 px-4 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 shadow-sm flex items-center gap-2 self-start md:self-auto"
          style={{ backgroundColor: PRIMARY }}
        >
          {isGenerating ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Generando...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generar recomendación con IA</>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-amber-900 text-sm">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Cargando recomendaciones...</div>
      ) : recomendaciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-fuchsia-50 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-fuchsia-700" />
          </div>
          <p className="text-gray-600 font-medium">No se encontraron recomendaciones.</p>
          <p className="text-xs text-gray-400">
            Genere una con el botón superior o atienda una cita para ejecutar el análisis completo (predicción + triaje + recomendación).
          </p>
          <Link
            to={`/pacientes/${pacienteId}`}
            className="inline-block py-2.5 px-5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            Ver ficha del paciente
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recomendaciones.map((rec) => (
            <div key={rec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-fuchsia-600 shrink-0" />
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">
                      {rec.titulo || rec.intervencion?.nombre}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {rec.intervencion?.categoria || rec.intervencion?.codigo || 'Automatizada'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-100 uppercase">
                  {rec.estado || 'Activo'}
                </span>
              </div>
              {(rec.algoritmo === 'gemini' || rec.origen === 'gemini') && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-100">
                  <Sparkles className="w-3 h-3" /> Generado por IA (Gemini)
                </div>
              )}
              {rec.descripcion && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{rec.descripcion}</p>
              )}
              {rec.notas && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">{rec.notas}</p>
              )}
              <p className="text-[10px] text-gray-400">
                {rec.fecha_recomendacion
                  ? new Date(rec.fecha_recomendacion).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Fecha no registrada'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
