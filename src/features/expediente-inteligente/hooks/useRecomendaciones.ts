import { useState, useEffect, useCallback } from 'react';
import {
  getRecomendacionesPaciente,
  getUltimaPrediccion,
  ejecutarRecomendacionesS4,
} from '../../../services/api';
import { getApiErrorMessage } from '../../../services/client';
import type { RecomendacionResponse } from '../../../services/api';

export function useRecomendaciones(pacienteId: number | null) {
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (pacienteId === null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRecomendacionesPaciente(pacienteId);
      setRecomendaciones(data);
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar recomendaciones.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  const generar = useCallback(async () => {
    if (pacienteId === null) return;
    setGenerating(true);
    setError(null);
    setInfoMsg(null);
    try {
      const ultimaPred = await getUltimaPrediccion(pacienteId);
      if (!ultimaPred?.prediccion_id) {
        throw new Error('No hay una predicción activa. Ejecute la predicción primero.');
      }
      const resultado = await ejecutarRecomendacionesS4(pacienteId, ultimaPred.prediccion_id);
      const actualizadas = await getRecomendacionesPaciente(pacienteId);
      setRecomendaciones(actualizadas);
      if (resultado.fuente_generacion === 'gemini') {
        setInfoMsg('Recomendación generada con Google Gemini (IA).');
      } else {
        setInfoMsg('Gemini no respondió; se usaron reglas clínicas locales. Revise GEMINI_APIKEY en el servidor.');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Error al generar recomendaciones.'));
    } finally {
      setGenerating(false);
    }
  }, [pacienteId]);

  return {
    recomendaciones,
    loading,
    generating,
    error,
    infoMsg,
    generar,
    recargar: load,
  };
}
