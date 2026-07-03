import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createDiaNoLaborable,
  deleteDiaNoLaborable,
  getDiasNoLaborables,
  getMedicos,
  validarFeriadoFecha,
  type DiaNoLaborable,
  type FeriadoConflictDetail,
  type FeriadoValidacionResponse,
  type MedicoResumen,
} from '../../../services/api';
import HorarioMedicoEditor from '../../../components/agenda/HorarioMedicoEditor';
import { PRIMARY } from '../../../constants/theme';

interface AgendaConfigPanelProps {
  onIrACitas?: (fecha: string) => void;
}

function isFeriadoConflict(detail: unknown): detail is FeriadoConflictDetail {
  return (
    typeof detail === 'object'
    && detail !== null
    && (detail as FeriadoConflictDetail).code === 'feriado_con_citas'
  );
}

export default function AgendaConfigPanel({ onIrACitas }: AgendaConfigPanelProps) {
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [medicoId, setMedicoId] = useState('');
  const [feriados, setFeriados] = useState<DiaNoLaborable[]>([]);
  const [nuevoFeriado, setNuevoFeriado] = useState({ fecha: '', motivo: '' });
  const [isSavingFeriado, setIsSavingFeriado] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [preview, setPreview] = useState<FeriadoValidacionResponse | null>(null);
  const [conflict, setConflict] = useState<FeriadoConflictDetail | null>(null);

  const loadFeriados = useCallback(async () => {
    const data = await getDiasNoLaborables();
    setFeriados(data.filter((f) => f.alcance === 'clinica'));
  }, []);

  useEffect(() => {
    getMedicos().then(setMedicos);
    loadFeriados();
  }, [loadFeriados]);

  useEffect(() => {
    if (!nuevoFeriado.fecha) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setIsValidating(true);
    const t = window.setTimeout(() => {
      validarFeriadoFecha(nuevoFeriado.fecha, 'clinica')
        .then((res) => {
          if (!cancelled) setPreview(res);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setIsValidating(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [nuevoFeriado.fecha]);

  const medicoSel = medicos.find((m) => m.id === Number(medicoId));

  const handleAddFeriado = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoFeriado.fecha) return;
    setIsSavingFeriado(true);
    setMsg(null);
    setConflict(null);
    try {
      const check = await validarFeriadoFecha(nuevoFeriado.fecha, 'clinica');
      if (!check.puede_feriado) {
        setConflict({
          code: 'feriado_con_citas',
          message:
            'Hay citas programadas o en atención en esta fecha. Reprográmelas antes de marcar el día como no laborable.',
          fecha: nuevoFeriado.fecha,
          total: check.total_citas,
          citas: check.citas,
        });
        return;
      }
      await createDiaNoLaborable({
        fecha: nuevoFeriado.fecha,
        motivo: nuevoFeriado.motivo || 'Feriado',
        alcance: 'clinica',
      });
      setNuevoFeriado({ fecha: '', motivo: '' });
      setPreview(null);
      await loadFeriados();
      setMsg({ text: 'Día no laborable registrado', ok: true });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (isFeriadoConflict(detail)) {
        setConflict(detail);
      } else {
        setMsg({
          text: typeof detail === 'string' ? detail : 'Error al registrar feriado',
          ok: false,
        });
      }
    } finally {
      setIsSavingFeriado(false);
    }
  };

  const handleDeleteFeriado = async (id: number) => {
    try {
      await deleteDiaNoLaborable(id);
      await loadFeriados();
    } catch {
      setMsg({ text: 'No se pudo eliminar el feriado', ok: false });
    }
  };

  const fechaConflicto = conflict?.fecha ?? nuevoFeriado.fecha;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {msg && (
        <div className={`xl:col-span-2 p-3 rounded-xl text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {conflict && (
        <div className="xl:col-span-2 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
          <div>
            <p className="text-sm font-bold text-amber-900">No se puede registrar el feriado</p>
            <p className="text-sm text-amber-800 mt-1">{conflict.message}</p>
            <p className="text-xs text-amber-700 mt-2">
              Fecha: <strong>{conflict.fecha}</strong> · {conflict.total} cita(s) pendiente(s)
            </p>
          </div>
          {conflict.citas.length > 0 && (
            <ul className="text-xs text-amber-900 space-y-1 max-h-32 overflow-y-auto bg-white/60 rounded-lg p-2 border border-amber-100">
              {conflict.citas.map((c) => (
                <li key={c.id}>
                  <strong>{c.hora}</strong> — {c.paciente_nombre ?? 'Paciente'} ({c.medico_nombre ?? 'Médico'})
                </li>
              ))}
            </ul>
          )}
          {onIrACitas && (
            <button
              type="button"
              onClick={() => onIrACitas(fechaConflicto)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              Ir a citas del día para reprogramar
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <h3 className="font-extrabold text-gray-900">Horarios por médico</h3>
        <select
          value={medicoId}
          onChange={(e) => setMedicoId(e.target.value)}
          className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
        >
          <option value="">Seleccionar médico</option>
          {medicos.map((m) => (
            <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
          ))}
        </select>
        {medicoId && (
          <HorarioMedicoEditor
            medicoId={Number(medicoId)}
            medicoNombre={medicoSel ? `Dr. ${medicoSel.nombre} ${medicoSel.apellidos}` : undefined}
          />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <h3 className="font-extrabold text-gray-900">Días no laborables (clínica)</h3>
        <p className="text-xs text-gray-500">
          Solo puede marcarse como feriado si no hay citas programadas ni en atención ese día.
        </p>
        <form onSubmit={handleAddFeriado} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fecha</label>
            <input
              type="date"
              required
              value={nuevoFeriado.fecha}
              onChange={(e) => {
                setNuevoFeriado({ ...nuevoFeriado, fecha: e.target.value });
                setConflict(null);
              }}
              className="text-sm px-3 py-2 border rounded-xl"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Motivo</label>
            <input
              type="text"
              value={nuevoFeriado.motivo}
              onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, motivo: e.target.value })}
              placeholder="Ej. Feriado nacional"
              className="w-full text-sm px-3 py-2 border rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingFeriado || isValidating || (preview !== null && !preview.puede_feriado)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {isSavingFeriado ? 'Guardando...' : 'Agregar'}
          </button>
        </form>

        {nuevoFeriado.fecha && preview && !preview.puede_feriado && !conflict && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
            Esta fecha tiene {preview.total_citas} cita(s) pendiente(s). Reprográmelas antes de agregar el feriado.
            {onIrACitas && (
              <button
                type="button"
                onClick={() => onIrACitas(nuevoFeriado.fecha)}
                className="block mt-2 font-bold text-amber-900 underline"
              >
                Ver citas del día
              </button>
            )}
          </div>
        )}

        {nuevoFeriado.fecha && preview?.puede_feriado && (
          <p className="text-xs text-emerald-700 font-medium">✓ Sin citas pendientes — puede registrarse el feriado.</p>
        )}

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {feriados.length === 0 ? (
            <p className="text-xs text-gray-400">No hay feriados registrados.</p>
          ) : (
            feriados.map((f) => (
              <div key={f.id} className="flex justify-between items-center p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">{f.fecha}</p>
                  <p className="text-xs text-gray-600">{f.motivo || 'Sin motivo'}</p>
                </div>
                <button type="button" onClick={() => handleDeleteFeriado(f.id)} className="text-xs text-red-600 font-semibold">
                  Eliminar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
