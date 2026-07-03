import { useEffect, useMemo, useState } from 'react';
import {
  getDisponibilidad,
  getDisponibilidadResumen,
  validarHorarioCita,
  type DisponibilidadSlot,
  type MedicoDisponibilidadResumen,
} from '../services/citas.api';

export function useDisponibilidadCita(
  medicoId: number | null,
  fecha: string,
  hora: string,
  duracionMinutos: number,
  excluirCitaId?: number | null,
) {
  const [slots, setSlots] = useState<DisponibilidadSlot[]>([]);
  const [motivoNoLaborable, setMotivoNoLaborable] = useState<string | null>(null);
  const [resumenMedicos, setResumenMedicos] = useState<MedicoDisponibilidadResumen[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLoadingResumen, setIsLoadingResumen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validacion, setValidacion] = useState<{ disponible: boolean; motivo?: string | null } | null>(null);
  const [showResumen, setShowResumen] = useState(false);

  useEffect(() => {
    if (!medicoId || !fecha) {
      setSlots([]);
      setMotivoNoLaborable(null);
      return;
    }
    let cancelled = false;
    setIsLoadingSlots(true);
    getDisponibilidad(medicoId, fecha, duracionMinutos)
      .then((data) => {
        if (!cancelled) {
          setSlots(data.slots);
          setMotivoNoLaborable(data.motivo_no_laborable ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setMotivoNoLaborable(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false);
      });
    return () => { cancelled = true; };
  }, [medicoId, fecha, duracionMinutos]);

  useEffect(() => {
    if (!medicoId || !fecha || !hora) {
      setValidacion(null);
      return;
    }
    let cancelled = false;
    setIsValidating(true);
    const t = window.setTimeout(() => {
      validarHorarioCita(medicoId, fecha, hora, duracionMinutos, excluirCitaId ?? undefined)
        .then((res) => {
          if (!cancelled) setValidacion(res);
        })
        .catch(() => {
          if (!cancelled) setValidacion({ disponible: false, motivo: 'No se pudo validar el horario' });
        })
        .finally(() => {
          if (!cancelled) setIsValidating(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [medicoId, fecha, hora, duracionMinutos, excluirCitaId]);

  useEffect(() => {
    if (!showResumen || !fecha || !hora) {
      setResumenMedicos([]);
      return;
    }
    let cancelled = false;
    setIsLoadingResumen(true);
    getDisponibilidadResumen(fecha, hora, duracionMinutos)
      .then((data) => {
        if (!cancelled) setResumenMedicos(data.medicos);
      })
      .catch(() => {
        if (!cancelled) setResumenMedicos([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingResumen(false);
      });
    return () => { cancelled = true; };
  }, [showResumen, fecha, hora, duracionMinutos]);

  const horarioValido = useMemo(() => {
    if (!medicoId || !fecha || !hora) return false;
    if (isLoadingSlots || isValidating) return false;
    if (motivoNoLaborable) return false;
    return validacion?.disponible === true;
  }, [medicoId, fecha, hora, isLoadingSlots, isValidating, motivoNoLaborable, validacion]);

  const motivoInvalido = useMemo(() => {
    if (motivoNoLaborable) return motivoNoLaborable;
    if (validacion && !validacion.disponible) return validacion.motivo ?? 'Horario no disponible';
    return null;
  }, [motivoNoLaborable, validacion]);

  return {
    slots,
    motivoNoLaborable,
    motivoInvalido,
    resumenMedicos,
    isLoadingSlots,
    isLoadingResumen,
    isValidating,
    showResumen,
    setShowResumen,
    horarioValido,
    seleccionarSlot: (horaInicio: string) => horaInicio,
  };
}
