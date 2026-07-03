import { useState, type FormEvent } from 'react';
import {
  cancelarCitaConMotivo,
  marcarAusenciaCita,
  reprogramarCita,
  type CitaResponseEnriquecida,
  type MedicoResumen,
} from '../../../services/api';
import { PRIMARY } from '../../../constants/theme';
import { formatLocalDate } from '../../../utils/date';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import { citaPermiteAusencia, formatCitaFechaHora } from '../../../utils/citaTime';
import SearchableEntitySelect from '../../../components/ui/SearchableEntitySelect';
import DisponibilidadSlots from '../../../components/ui/DisponibilidadSlots';
import { useDisponibilidadCita } from '../../../hooks/useDisponibilidadCita';
import { formatFullDate, getStatusBadgeStyles, getStatusLabel } from '../citaUiUtils';

export interface EditCitaForm {
  fecha: string;
  hora: string;
  medico_id: string;
  estado: CitaResponseEnriquecida['estado'];
  notas: string;
  duracion_minutos: number;
}

type Panel = 'editar' | 'reprogramar' | 'ausencia' | 'cancelar';

const ESTADOS_CERRADOS = new Set([
  'cumplida',
  'cancelada',
  'reprogramada',
  'no_asistio_paciente',
  'no_asistio_medico',
]);

const ESTADOS_EDITABLES: Record<string, CitaResponseEnriquecida['estado'][]> = {
  programada: ['programada', 'en_atencion', 'cancelada'],
  en_atencion: ['en_atencion', 'cumplida', 'cancelada'],
};

interface EditCitaModalProps {
  cita: CitaResponseEnriquecida;
  form: EditCitaForm;
  medicos: MedicoResumen[];
  isSaving: boolean;
  showAgendaActions?: boolean;
  onClose: () => void;
  onChange: (form: EditCitaForm) => void;
  onSubmit: (e: FormEvent) => void;
  onActionDone: (message: string) => void;
}

export default function EditCitaModal({
  cita,
  form,
  medicos,
  isSaving,
  showAgendaActions = true,
  onClose,
  onChange,
  onSubmit,
  onActionDone,
}: EditCitaModalProps) {
  const [panel, setPanel] = useState<Panel>('editar');
  const [motivo, setMotivo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionSaving, setIsActionSaving] = useState(false);

  const [repFecha, setRepFecha] = useState(form.fecha);
  const [repHora, setRepHora] = useState(form.hora);
  const [repDuracion, setRepDuracion] = useState(form.duracion_minutos);
  const [repMedicoId, setRepMedicoId] = useState(form.medico_id);

  const repMedicoNum = repMedicoId ? Number(repMedicoId) : null;
  const {
    slots: repSlots,
    motivoNoLaborable: repMotivoNoLaborable,
    motivoInvalido: repMotivoInvalido,
    isLoadingSlots: repLoadingSlots,
    horarioValido: repHorarioValido,
  } = useDisponibilidadCita(repMedicoNum, repFecha, repHora, repDuracion, cita.id);

  const cerrada = ESTADOS_CERRADOS.has(cita.estado);
  const puedeAccionar = showAgendaActions && ['programada', 'en_atencion'].includes(cita.estado);
  const permiteAusencia = citaPermiteAusencia(cita.fecha_hora);
  const estadosPermitidos = ESTADOS_EDITABLES[cita.estado] ?? [cita.estado];

  const backdrop = useModalBackdrop(onClose);

  const handleReprogramar = async (e: FormEvent) => {
    e.preventDefault();
    if (!repHorarioValido) return;
    setIsActionSaving(true);
    setActionError(null);
    const inicio = `${repFecha}T${repHora}:00`;
    try {
      await reprogramarCita(cita.id, {
        fecha_hora: inicio,
        duracion_minutos: repDuracion,
        medico_id: Number(repMedicoId),
        motivo: motivo || 'Reprogramada desde edición de cita',
      });
      onActionDone('Cita reprogramada: se creó una nueva cita y la anterior quedó como reprogramada');
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionError(detail || 'No se pudo reprogramar la cita');
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleAusencia = async (tipo: 'paciente' | 'medico') => {
    setIsActionSaving(true);
    setActionError(null);
    try {
      await marcarAusenciaCita(cita.id, { tipo, motivo: motivo || undefined });
      onActionDone(
        tipo === 'paciente'
          ? 'Cita marcada como no asistió la paciente'
          : 'Cita marcada como no asistió el médico',
      );
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionError(detail || 'No se pudo registrar la ausencia');
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleCancelar = async (e: FormEvent) => {
    e.preventDefault();
    setIsActionSaving(true);
    setActionError(null);
    try {
      await cancelarCitaConMotivo(cita.id, motivo || undefined);
      onActionDone('Cita cancelada correctamente');
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionError(detail || 'No se pudo cancelar la cita');
    } finally {
      setIsActionSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-extrabold text-lg text-gray-900">Editar Cita #{cita.id}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{cita.paciente_nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyles(cita.estado)}`}>
              {getStatusLabel(cita.estado)}
            </span>
            <span className="text-xs text-gray-500">{formatFullDate(cita.fecha_hora)}</span>
          </div>
          {cita.motivo_cierre && (
            <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2">{cita.motivo_cierre}</p>
          )}
          {cita.cita_anterior_id && (
            <p className="text-xs text-purple-700 mb-4">Reemplazo de cita #{cita.cita_anterior_id}</p>
          )}
        </div>

        {panel === 'editar' && (
          <form onSubmit={onSubmit} className="p-6 pt-0 space-y-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha y hora actuales</p>
              <p className="font-semibold text-gray-900">
                {formatLocalDate(new Date(cita.fecha_hora))} · {form.hora} · {cita.duracion_minutos} min
              </p>
              {puedeAccionar && (
                <p className="text-[11px] text-fuchsia-800 mt-2">
                  Para cambiar fecha u hora use <strong>Reprogramar</strong> (se crea una cita nueva y esta queda como reprogramada).
                </p>
              )}
            </div>

            {!cerrada && (
              <>
                <SearchableEntitySelect
                  mode="medico"
                  label="Obstetra"
                  value={form.medico_id}
                  onChange={(v) => onChange({ ...form, medico_id: v })}
                  medicos={medicos}
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Estado</label>
                  <select
                    required
                    value={form.estado}
                    onChange={(e) => onChange({ ...form, estado: e.target.value as CitaResponseEnriquecida['estado'] })}
                    className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
                  >
                    {estadosPermitidos.map((e) => (
                      <option key={e} value={e}>{getStatusLabel(e)}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Ausencias y reprogramación se registran con las acciones de abajo para el control de métricas.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Notas</label>
                  <textarea
                    rows={3}
                    value={form.notas}
                    onChange={(e) => onChange({ ...form, notas: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
                  />
                </div>
              </>
            )}

            {cerrada && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                Esta cita está cerrada y no se puede modificar. Solo consulta.
              </p>
            )}

            {puedeAccionar && (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Acciones de agenda</p>
                <button
                  type="button"
                  onClick={() => { setPanel('reprogramar'); setActionError(null); setMotivo(''); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Reprogramar cita
                </button>
                <button
                  type="button"
                  disabled={!permiteAusencia}
                  onClick={() => { if (permiteAusencia) { setPanel('ausencia'); setActionError(null); setMotivo(''); } }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-amber-200 text-amber-800 bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={!permiteAusencia ? 'Solo disponible cuando llega la hora de la cita' : undefined}
                >
                  Marcar no asistió (paciente o médico)
                </button>
                {!permiteAusencia && (
                  <p className="text-[10px] text-amber-700">
                    La ausencia solo puede registrarse desde {formatCitaFechaHora(cita.fecha_hora)} (hora Perú).
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => { setPanel('cancelar'); setActionError(null); setMotivo(''); }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-700 bg-red-50"
                >
                  Cancelar cita
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="py-2.5 px-4 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
                Cerrar
              </button>
              {!cerrada && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2.5 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            </div>
          </form>
        )}

        {panel === 'reprogramar' && (
          <form onSubmit={handleReprogramar} className="p-6 pt-0 space-y-4">
            <p className="text-sm text-gray-600">
              Se creará una <strong>nueva cita</strong> y la actual quedará como <strong>reprogramada</strong>.
            </p>
            <SearchableEntitySelect
              mode="medico"
              label="Obstetra"
              value={repMedicoId}
              onChange={setRepMedicoId}
              medicos={medicos}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nueva fecha</label>
                <input
                  type="date"
                  required
                  value={repFecha}
                  onChange={(e) => setRepFecha(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nueva hora</label>
                <input
                  type="time"
                  required
                  value={repHora}
                  onChange={(e) => setRepHora(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
                />
              </div>
            </div>
            {repMedicoNum && repFecha && (
              <DisponibilidadSlots
                slots={repSlots}
                horaSeleccionada={repHora}
                isLoading={repLoadingSlots}
                motivoNoLaborable={repMotivoNoLaborable}
                onSelect={setRepHora}
              />
            )}
            {!repHorarioValido && repHora && !repLoadingSlots && (
              <p className="text-xs text-amber-700">
                {repMotivoInvalido ?? 'El horario seleccionado no está disponible para la duración indicada.'}
              </p>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Duración</label>
              <select
                value={repDuracion}
                onChange={(e) => setRepDuracion(Number(e.target.value))}
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
              >
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Motivo</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo de reprogramación"
                className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setPanel('editar')} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200">
                Volver
              </button>
              <button
                type="submit"
                disabled={isActionSaving || !repHorarioValido || repLoadingSlots}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {isActionSaving ? 'Guardando...' : 'Confirmar reprogramación'}
              </button>
            </div>
          </form>
        )}

        {panel === 'ausencia' && (
          <div className="p-6 pt-0 space-y-4">
            <p className="text-sm text-gray-600">
              La cita quedará registrada como no asistencia para el control de estadísticas.
            </p>
            {!permiteAusencia && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
                Esta cita es futura. Espere a la hora programada ({formatCitaFechaHora(cita.fecha_hora)}) o cancele/reprograme.
              </p>
            )}
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            />
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <button
              type="button"
              disabled={isActionSaving || !permiteAusencia}
              onClick={() => handleAusencia('paciente')}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-amber-100 text-amber-900 disabled:opacity-50"
            >
              No asistió la paciente
            </button>
            <button
              type="button"
              disabled={isActionSaving || !permiteAusencia}
              onClick={() => handleAusencia('medico')}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-rose-100 text-rose-900 disabled:opacity-50"
            >
              No asistió el médico
            </button>
            <button type="button" onClick={() => setPanel('editar')} className="text-xs text-gray-500">
              Volver
            </button>
          </div>
        )}

        {panel === 'cancelar' && (
          <form onSubmit={handleCancelar} className="p-6 pt-0 space-y-4">
            <p className="text-sm text-gray-600">La cita quedará como <strong>cancelada</strong>.</p>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo de cancelación"
              className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            />
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setPanel('editar')} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200">
                Volver
              </button>
              <button
                type="submit"
                disabled={isActionSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white disabled:opacity-50"
              >
                {isActionSaving ? 'Guardando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
