import { useRecomendaciones } from '../hooks/useRecomendaciones';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface RecommendationTabProps {
  pacienteId: number;
}

const MODELOS: { key: string; label: string }[] = [
  { key: 'random_forest', label: 'Random Forest (S-4)' },
  { key: 'cart', label: 'Árbol de Decisión (CART)' },
  { key: 'if_then', label: 'Reglas Si-Entonces' },
];

export default function RecommendationTab({ pacienteId }: RecommendationTabProps) {
  const { filtradas, modelo, setModelo, loading, generating, error, generar } = useRecomendaciones(pacienteId);

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-xl">
          <select
            value={modelo}
            onChange={e => setModelo(e.target.value)}
            disabled={generating || loading}
            className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer py-0.5 px-2 disabled:opacity-50"
          >
            {MODELOS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <button onClick={generar} disabled={generating || loading}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 shadow-sm flex items-center gap-2"
          style={{ backgroundColor: '#612853' }}>
          {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generando...</> : 'Generar Recomendaciones'}
        </button>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3">
          <p className="text-gray-600 font-medium">No hay recomendaciones registradas para esta paciente.</p>
          <p className="text-xs text-gray-400">Presione el botón "Generar Recomendaciones" para ejecutar el módulo S-4.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((rec: any) => (
            <div key={rec.id || rec.recomendacion_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">{rec.titulo || rec.intervencion?.nombre || rec.recomendacion}</h3>
                  <p className="text-[10px] text-gray-500">{rec.intervencion?.categoria || rec.intervencion?.codigo || 'Automatizada'}</p>
                </div>
                <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-100 uppercase">
                  {rec.estado || 'Activo'}
                </span>
              </div>
              {rec.descripcion && <p className="text-xs text-gray-700 leading-relaxed">{rec.descripcion}</p>}
              {rec.notas && <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">{rec.notas}</p>}
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
