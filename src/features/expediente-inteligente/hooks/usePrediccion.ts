import { useState, useEffect, useCallback } from 'react';
import {
  getPacientePerfil,
  getUltimaPrediccion,
  getHistorialPredicciones,
  ejecutarPrediccionConsenso,
} from '../../../services/api';
import { getApiErrorMessage } from '../../../services/client';
import type {
  PacientePerfilResponse,
  PrediccionUltimaResponse,
  PrediccionHistorialItem,
} from '../../../services/api';

function perfilSinDatosClinicos(profile: PacientePerfilResponse): boolean {
  return (
    profile.edad_gestacional_semanas == null &&
    profile.longitud_cervical_mm == null &&
    profile.bmi == null
  );
}

export function usePrediccion(pacienteId: number | null) {
  const [profile, setProfile] = useState<PacientePerfilResponse | null>(null);
  const [prediction, setPrediction] = useState<PrediccionUltimaResponse | null>(null);
  const [historial, setHistorial] = useState<PrediccionHistorialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinDatosClinicos, setSinDatosClinicos] = useState(false);

  const load = useCallback(async () => {
    if (pacienteId === null) return;
    setLoading(true);
    setError(null);
    setSinDatosClinicos(false);
    try {
      const [perfRes, predRes, histRes] = await Promise.allSettled([
        getPacientePerfil(pacienteId),
        getUltimaPrediccion(pacienteId),
        getHistorialPredicciones(pacienteId),
      ]);

      if (perfRes.status === 'fulfilled') {
        setProfile(perfRes.value);
        setSinDatosClinicos(perfilSinDatosClinicos(perfRes.value));
      } else {
        setProfile(null);
        setError(getApiErrorMessage(perfRes.reason, 'No se pudo cargar el perfil del paciente.'));
      }

      if (predRes.status === 'fulfilled') {
        setPrediction(predRes.value);
      } else {
        setPrediction(null);
      }

      if (histRes.status === 'fulfilled') {
        setHistorial(histRes.value);
      } else {
        setHistorial([]);
      }
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
      setSinDatosClinicos(perfilSinDatosClinicos(perf));
      setHistorial(hist);
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Error al ejecutar la predicción.'));
    } finally {
      setCalculating(false);
    }
  }, [pacienteId]);

  return { profile, prediction, historial, loading, calculating, error, sinDatosClinicos, ejecutar, recargar: load };
}
