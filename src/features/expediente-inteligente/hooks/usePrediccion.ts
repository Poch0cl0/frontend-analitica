import { useState, useEffect, useCallback } from 'react';
import {
  getPacientePerfil,
  getUltimaPrediccion,
  getHistorialPredicciones,
  ejecutarPrediccionConsenso,
} from '../../../services/api';
import type {
  PacientePerfilResponse,
  PrediccionUltimaResponse,
  PrediccionHistorialItem,
} from '../../../services/api';

export function usePrediccion(pacienteId: number | null) {
  const [profile, setProfile] = useState<PacientePerfilResponse | null>(null);
  const [prediction, setPrediction] = useState<PrediccionUltimaResponse | null>(null);
  const [historial, setHistorial] = useState<PrediccionHistorialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (pacienteId === null) return;
    setLoading(true);
    setError(null);
    try {
      const [perf, pred, hist] = await Promise.all([
        getPacientePerfil(pacienteId),
        getUltimaPrediccion(pacienteId),
        getHistorialPredicciones(pacienteId),
      ]);
      setProfile(perf);
      setPrediction(pred);
      setHistorial(hist);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al cargar datos de predicción.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  const ejecutar = useCallback(async () => {
    if (pacienteId === null) return;
    setCalculating(true);
    setError(null);
    try {
      const result = await ejecutarPrediccionConsenso(pacienteId);
      setPrediction(result);
      const [perf, hist] = await Promise.all([
        getPacientePerfil(pacienteId),
        getHistorialPredicciones(pacienteId),
      ]);
      setProfile(perf);
      setHistorial(hist);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al ejecutar la predicción.');
    } finally {
      setCalculating(false);
    }
  }, [pacienteId]);

  return { profile, prediction, historial, loading, calculating, error, ejecutar, recargar: load };
}
