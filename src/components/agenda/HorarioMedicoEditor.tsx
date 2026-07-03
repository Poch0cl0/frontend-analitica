import { useCallback, useEffect, useState } from 'react';
import {
  getCitasPendientesHorarioMedico,
  getHorariosMedico,
  setHorariosMedicoBulk,
  validarBloquesHorarioMedico,
  type CitaPendienteHorario,
  type HorarioMedico,
  type HorarioMedicoCreate,
  type HorarioValidacionResponse,
} from '../../services/api';
import { PRIMARY } from '../../constants/theme';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface BloqueForm {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

interface HorarioMedicoEditorProps {
  medicoId: number;
  medicoNombre?: string;
  onSaved?: () => void;
  compact?: boolean;
}

export default function HorarioMedicoEditor({
  medicoId,
  medicoNombre,
  onSaved,
  compact,
}: HorarioMedicoEditorProps) {
  const [horarios, setHorarios] = useState<HorarioMedico[]>([]);
  const [bloques, setBloques] = useState<BloqueForm[]>([]);
  const [pendientes, setPendientes] = useState<HorarioValidacionResponse | null>(null);
  const [preview, setPreview] = useState<HorarioValidacionResponse | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadPendientes = useCallback(async () => {
    try {
      const data = await getCitasPendientesHorarioMedico(medicoId);
      setPendientes(data);
    } catch {
      setPendientes(null);
    }
  }, [medicoId]);

  useEffect(() => {
    getHorariosMedico(medicoId).then((h) => {
      setHorarios(h);
      setBloques(
        h.filter((x) => x.activo).map((x) => ({
          dia_semana: x.dia_semana,
          hora_inicio: x.hora_inicio.slice(0, 5),
          hora_fin: x.hora_fin.slice(0, 5),
        })),
      );
    });
    loadPendientes();
  }, [medicoId, loadPendientes]);

  const addBloque = () => {
    setBloques((prev) => [...prev, { dia_semana: 0, hora_inicio: '08:00', hora_fin: '12:00' }]);
    setPreview(null);
    setConfirmSave(false);
  };

  const updateBloque = (idx: number, field: keyof BloqueForm, value: string | number) => {
    setBloques((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
    setPreview(null);
    setConfirmSave(false);
  };

  const removeBloque = (idx: number) => {
    setBloques((prev) => prev.filter((_, i) => i !== idx));
    setPreview(null);
    setConfirmSave(false);
  };

  const bloquesPayload = (): HorarioMedicoCreate[] =>
    bloques.map((b) => ({ ...b, activo: true }));

  const runPreview = async (): Promise<HorarioValidacionResponse | null> => {
    try {
      const result = await validarBloquesHorarioMedico(medicoId, bloquesPayload());
      setPreview(result);
      return result;
    } catch {
      return null;
    }
  };

  const save = async () => {
    setIsSaving(true);
    setMsg(null);
    try {
      let validacion = preview;
      if (!validacion) {
        validacion = await runPreview();
      }
      if (validacion && validacion.fuera_horario > 0 && !confirmSave) {
        setConfirmSave(true);
        setIsSaving(false);
        return;
      }

      const payload = bloquesPayload();
      await setHorariosMedicoBulk(medicoId, payload);
      const h = await getHorariosMedico(medicoId);
      setHorarios(h);
      await loadPendientes();
      setPreview(null);
      setConfirmSave(false);
      setMsg({
        text: validacion?.fuera_horario
          ? `Horarios guardados. ${validacion.fuera_horario} cita(s) pendiente(s) quedan fuera del nuevo horario (no se cancelaron).`
          : 'Horarios guardados',
        ok: true,
      });
      onSaved?.();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMsg({ text: detail || 'Error al guardar', ok: false });
    } finally {
      setIsSaving(false);
    }
  };

  const citasAviso = preview ?? pendientes;
  const listaFuera: CitaPendienteHorario[] = citasAviso?.citas ?? [];

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {medicoNombre && (
        <p className="text-sm font-bold text-gray-800">{medicoNombre}</p>
      )}
      <p className="text-xs text-gray-500">
        Las citas ya agendadas <strong>no se cancelan</strong> al cambiar el horario. Las pasadas se conservan en el historial.
      </p>

      {pendientes && pendientes.total_pendientes > 0 && (
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-sky-900">
          <p className="font-bold">
            {pendientes.total_pendientes} cita(s) futura(s) sin atender
            {pendientes.fuera_horario > 0 && (
              <span className="text-amber-800"> · {pendientes.fuera_horario} fuera del horario actual</span>
            )}
          </p>
        </div>
      )}

      {confirmSave && preview && preview.fuera_horario > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-900">
            {preview.fuera_horario} cita(s) quedarán fuera del nuevo horario. No se cancelarán automáticamente.
          </p>
          <ul className="text-[11px] text-amber-900 space-y-1 max-h-28 overflow-y-auto">
            {listaFuera.map((c) => (
              <li key={c.cita_id}>
                #{c.cita_id} {c.paciente_nombre} — {new Date(c.fecha_hora).toLocaleString('es-PE')}
                <span className="block text-amber-700">{c.motivo}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-amber-800">Vuelva a pulsar Guardar para confirmar o reprograme esas citas desde la agenda.</p>
        </div>
      )}

      {msg && (
        <div className={`p-2 rounded-lg text-xs ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {bloques.length === 0 ? (
          <p className="text-xs text-amber-700">Sin bloques. Agrega al menos uno.</p>
        ) : (
          bloques.map((b, idx) => (
            <div key={idx} className="flex flex-wrap gap-2 items-center p-2 rounded-lg bg-gray-50">
              <select value={b.dia_semana} onChange={(e) => updateBloque(idx, 'dia_semana', Number(e.target.value))} className="text-xs px-2 py-1.5 border rounded-lg">
                {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
              <input type="time" value={b.hora_inicio} onChange={(e) => updateBloque(idx, 'hora_inicio', e.target.value)} className="text-xs px-2 py-1.5 border rounded-lg" />
              <span className="text-gray-400 text-xs">a</span>
              <input type="time" value={b.hora_fin} onChange={(e) => updateBloque(idx, 'hora_fin', e.target.value)} className="text-xs px-2 py-1.5 border rounded-lg" />
              <button type="button" onClick={() => removeBloque(idx)} className="text-xs text-red-600 font-semibold ml-auto">Quitar</button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addBloque} className="text-xs font-semibold text-fuchsia-900 hover:underline">+ Agregar bloque</button>
        <button
          type="button"
          onClick={() => { setConfirmSave(false); runPreview(); }}
          className="text-xs font-semibold text-gray-600 hover:underline"
        >
          Ver impacto en citas
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="ml-auto px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: PRIMARY }}
        >
          {isSaving ? 'Guardando...' : confirmSave ? 'Confirmar y guardar' : 'Guardar horarios'}
        </button>
      </div>

      {horarios.length > 0 && bloques.length === 0 && (
        <p className="text-xs text-gray-400">Había {horarios.length} bloque(s) guardados; ninguno activo ahora.</p>
      )}
    </div>
  );
}
