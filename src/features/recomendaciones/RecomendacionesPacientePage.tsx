import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  getRecomendacionesPaciente, 
  getPacienteById, 
  getUltimaPrediccion, 
  ejecutarRecomendacionesS4 
} from '../../services/api';
import type { RecomendacionResponse, PacienteResponse } from '../../services/api';

const PRIMARY = '#612853';

// Tipado exacto extraído de tu JSON del backend
type AlgoritmoS4 = 'if_then' | 'cart' | 'random_forest';

export default function RecomendacionesPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ESTADOS: Control del selector y loader de generación
  const [modeloSeleccionado, setModeloSeleccionado] = useState<AlgoritmoS4>('random_forest');
  const [isGenerating, setIsGenerating] = useState(false);

  const load = async () => {
    if (!pacienteId) return;
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

  useEffect(() => {
    load();
  }, [pacienteId]);

  // Ejecución del flujo secuencial del backend
  const handleGenerarClick = async () => {
    if (!pacienteId) return;
    
    setIsGenerating(true);
    try {
      // 1. Obtener la última predicción para conseguir el prediccion_id requerido por el path
      const ultimaPred = await getUltimaPrediccion(Number(pacienteId));
      
      if (!ultimaPred || !ultimaPred.prediccion_id) {
        alert("No se encontró una predicción activa. Por favor, analice el riesgo del paciente primero.");
        return;
      }

      // 2. Ejecutar el módulo S-4 automático
      await ejecutarRecomendacionesS4(Number(pacienteId), ultimaPred.prediccion_id);
      
      // 3. Recargar el listado completo actualizado
      const recsActualizadas = await getRecomendacionesPaciente(Number(pacienteId));
      setRecomendaciones(recsActualizadas);
      
      alert("¡Módulo S-4 ejecutado! Recomendaciones recalculadas para todos los modelos.");
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.status === 404) {
        alert("Error 404: No se encontró la predicción o el paciente en el sistema.");
      } else {
        alert("Error al conectar con el servidor de analítica.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // FILTRADO EN TIEMPO REAL: Filtramos el array según el algoritmo seleccionado en el dropdown
  // Nota: Si tu propiedad en RecomendacionResponse se llama 'algoritmo', se mapeará directamente.
  const recomendacionesFiltradas = recomendaciones.filter(
    (rec: any) => rec.algoritmo === modeloSeleccionado
  );

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full space-y-6">
      
      {/* HEADER Y SELECCIÓN DE MODELO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-4">
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

        {/* SELECTOR CON VALORES REALES DE TU ENDPOINT */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-xl self-start md:self-auto">
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Modelo Recomendador</span>
            <p className="text-[9px] text-amber-600 font-medium mb-0.5">Vista histórica — S-4 productivo usa Gemini</p>
            <select
              value={modeloSeleccionado}
              onChange={(e) => setModeloSeleccionado(e.target.value as AlgoritmoS4)}
              disabled={isGenerating || isLoading}
              className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer py-0.5 pr-2 disabled:opacity-50"
            >
              <option value="random_forest">Random Forest (S-4)</option>
              <option value="cart">Árbol de Decisión (CART)</option>
              <option value="if_then">Reglas Si-Entonces</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerarClick}
            disabled={isGenerating || isLoading}
            className="py-2 px-4 rounded-lg text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 shadow-sm whitespace-nowrap"
            style={{ backgroundColor: PRIMARY }}
          >
            {isGenerating ? 'Generando...' : 'Generar Recomendaciones'}
          </button>
        </div>
      </div>

      {/* RENDERIZADO DE CONTENIDO */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Cargando recomendaciones...</div>
      ) : recomendaciones.length === 0 ? (
        // Estado vacío global: Cuando el paciente no tiene absolutamente nada generado
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3">
          <p className="text-gray-600 font-medium">No hay recomendaciones registradas para esta paciente.</p>
          <p className="text-xs text-gray-400">Presione el botón superior izquierdo para ejecutar el módulo S-4 por primera vez.</p>
          <Link to={`/pacientes/${pacienteId}`} className="inline-block py-2.5 px-5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PRIMARY }}>
            Ver ficha del paciente
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Estado vacío por filtro: Si hay recomendaciones pero ninguna del modelo seleccionado */}
          {recomendacionesFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              No se encontraron recomendaciones guardadas bajo el modelo <span className="font-bold text-gray-600">{modeloSeleccionado}</span>.
            </div>
          ) : (
            // Renderizado de las tarjetas filtradas
            recomendacionesFiltradas.map((rec: any) => (
              <div key={rec.id || rec.recomendacion_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">
                      {rec.titulo || rec.intervencion?.nombre || rec.recomendacion}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {rec.intervencion?.categoria || rec.intervencion?.codigo || 'Automatizada'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-100 uppercase">
                    {rec.estado || 'Activo'}
                  </span>
                </div>
                {rec.descripcion && (
                  <p className="text-sm text-gray-700 leading-relaxed">{rec.descripcion}</p>
                )}
                {rec.notas && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">{rec.notas}</p>
                )}
                <p className="text-[10px] text-gray-400">
                  {rec.fecha_recomendacion 
                    ? new Date(rec.fecha_recomendacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Fecha no registrada'}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}