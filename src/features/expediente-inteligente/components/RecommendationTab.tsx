import { useRecomendaciones } from '../hooks/useRecomendaciones';
import { RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';

interface RecommendationTabProps {
  pacienteId: number;
}

export default function RecommendationTab({ pacienteId }: RecommendationTabProps) {
  const { recomendaciones, loading, generating, error, generar } = useRecomendaciones(pacienteId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#612853] animate-spin" />
        <p className="text-sm text-gray-500">Cargando recomendaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-amber-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button onClick={generar} disabled={generating || loading}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 shadow-sm flex items-center gap-2"
          style={{ backgroundColor: '#612853' }}>
          {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4" /> Generar Recomendación con IA</>}
        </button>
      </div>

      {recomendaciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-fuchsia-50 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-fuchsia-700" />
          </div>
          <p className="text-gray-600 font-medium">No hay recomendaciones registradas para esta paciente.</p>
          <p className="text-xs text-gray-400">Presione "Generar Recomendación con IA" para obtener una recomendación clínica basada en los datos de la paciente mediante inteligencia artificial.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recomendaciones.map((rec: any) => (
            <div key={rec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-fuchsia-600 shrink-0" />
                  <h3 className="text-sm font-extrabold text-gray-900">{rec.titulo || rec.intervencion?.nombre}</h3>
                </div>
                <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-100 uppercase">
                  {rec.estado || 'Activo'}
                </span>
              </div>
              {rec.algoritmo === 'gemini' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-100">
                  <Sparkles className="w-3 h-3" /> Generado por IA
                </div>
              )}
              {rec.descripcion && (
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{rec.descripcion}</p>
              )}
              {rec.notas && (
                <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">{rec.notas}</p>
              )}
              {rec.intervencion?.categoria && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Tipo:</span>
                  <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{rec.intervencion.categoria}</span>
                </div>
              )}
              <p className="text-[9px] text-gray-400">
                {rec.fecha_recomendacion
                  ? new Date(rec.fecha_recomendacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Fecha no registrada'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
