import { useState, useEffect, useCallback } from 'react';
import {
  getRecomendacionesPaciente,
  getUltimaPrediccion,
  ejecutarRecomendacionesS4,
} from '../../../services/api';
import type { RecomendacionResponse } from '../../../services/api';

export function useRecomendaciones(pacienteId: number | null) {
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modelo, setModelo] = useState<string>('random_forest');
  const [error, setError] = useState<string | null>(null);

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
    try {
      const ultimaPred = await getUltimaPrediccion(pacienteId);
      if (!ultimaPred?.prediccion_id) {
        throw new Error('No hay una predicción activa. Ejecute la predicción primero.');
      }
      await ejecutarRecomendacionesS4(pacienteId, ultimaPred.prediccion_id);
      const actualizadas = await getRecomendacionesPaciente(pacienteId);
      setRecomendaciones(actualizadas);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al generar recomendaciones.');
    } finally {
      setGenerating(false);
    }
  }, [pacienteId]);

  const filtradas = recomendaciones.filter(r => r.algoritmo === modelo);

  return {
    recomendaciones,
    filtradas,
    modelo,
    setModelo,
    loading,
    generating,
    error,
    generar,
    recargar: load,
  };
}
