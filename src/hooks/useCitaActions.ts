import type { FormEvent } from 'react';
import { createCita, deleteCita, updateCita, type CitaCreate, type CitaResponseEnriquecida, type CitaUpdate } from '../services/api';
import type { EditCitaForm } from '../features/citas/components/EditCitaModal';
import type { NewCitaForm } from '../features/citas/components/CreateCitaModal';
import { formatLocalDate } from '../utils/date';

interface UseCitaActionsOptions {
  isSecretary: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
  onCloseModal: () => void;
  onCreated?: (pacienteId: number) => void;
}

export function useCitaActions({
  isSecretary,
  onSuccess,
  onError,
  onRefresh,
  onCloseModal,
  onCreated,
}: UseCitaActionsOptions) {
  const resolveMedicoId = (form: NewCitaForm): number | null => {
    if (form.medico_id) return Number(form.medico_id);
    if (isSecretary && form.medico_asignado_fallback) return form.medico_asignado_fallback;
    return null;
  };

  const handleCreate = async (e: FormEvent, form: NewCitaForm, setSaving: (v: boolean) => void) => {
    e.preventDefault();
    if (!form.paciente_id || !form.fecha || !form.hora) {
      onError('Por favor, selecciona paciente, fecha y hora');
      return;
    }
    const medicoId = resolveMedicoId(form);
    if (!medicoId) {
      onError(
        isSecretary
          ? 'Selecciona un médico disponible o asigna uno al expediente de la paciente.'
          : 'Por favor, selecciona un médico',
      );
      return;
    }
    setSaving(true);
    try {
      const inicio = `${form.fecha}T${form.hora}:00`;
      const payload: CitaCreate = {
        paciente_id: Number(form.paciente_id),
        medico_id: medicoId,
        fecha_hora: inicio,
        duracion_minutos: form.duracion_minutos,
        notas: form.notas,
      };
      await createCita(payload);
      onCreated?.(Number(form.paciente_id));
      onSuccess('Cita programada con éxito');
      onCloseModal();
      await onRefresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      onError(detail || 'No se pudo programar la cita');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    e: FormEvent,
    citaId: number,
    form: EditCitaForm,
    setSaving: (v: boolean) => void,
  ) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CitaUpdate = {
        medico_id: Number(form.medico_id),
        estado: form.estado,
        notas: form.notas,
      };
      await updateCita(citaId, payload);
      onSuccess('Cita actualizada exitosamente');
      onCloseModal();
      await onRefresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      onError(detail || 'No se pudo actualizar la cita');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (citaId: number) => {
    try {
      await deleteCita(citaId);
      onSuccess('La cita ha sido cancelada exitosamente');
      onCloseModal();
      await onRefresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      onError(detail || 'No se pudo cancelar la cita');
    }
  };

  const buildEditForm = (cita: CitaResponseEnriquecida): EditCitaForm => {
    const dt = new Date(cita.fecha_hora);
    return {
      fecha: formatLocalDate(dt),
      hora: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
      medico_id: String(cita.medico_id),
      estado: cita.estado,
      notas: cita.notas || '',
      duracion_minutos: cita.duracion_minutos,
    };
  };

  const buildNewForm = (): NewCitaForm => {
    const now = new Date();
    return {
      paciente_id: '',
      medico_id: '',
      fecha: formatLocalDate(now),
      hora: `${String(now.getHours() + 1).padStart(2, '0')}:00`,
      notas: '',
      duracion_minutos: 30,
    };
  };

  return { handleCreate, handleUpdate, handleDelete, buildEditForm, buildNewForm };
}
