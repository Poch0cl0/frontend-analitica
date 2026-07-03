import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createDiaNoLaborable,
  deleteDiaNoLaborable,
  getDiasNoLaborables,
  getMedicos,
  type DiaNoLaborable,
  type MedicoResumen,
} from '../../../services/api';
import HorarioMedicoEditor from '../../../components/agenda/HorarioMedicoEditor';
import { PRIMARY } from '../../../constants/theme';

export default function AgendaConfigPanel() {
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [medicoId, setMedicoId] = useState('');
  const [feriados, setFeriados] = useState<DiaNoLaborable[]>([]);
  const [nuevoFeriado, setNuevoFeriado] = useState({ fecha: '', motivo: '' });
  const [isSavingFeriado, setIsSavingFeriado] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadFeriados = useCallback(async () => {
    const data = await getDiasNoLaborables();
    setFeriados(data.filter((f) => f.alcance === 'clinica'));
  }, []);

  useEffect(() => {
    getMedicos().then(setMedicos);
    loadFeriados();
  }, [loadFeriados]);

  const medicoSel = medicos.find((m) => m.id === Number(medicoId));

  const handleAddFeriado = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoFeriado.fecha) return;
    setIsSavingFeriado(true);
    setMsg(null);
    try {
      await createDiaNoLaborable({
        fecha: nuevoFeriado.fecha,
        motivo: nuevoFeriado.motivo || 'Feriado',
        alcance: 'clinica',
      });
      setNuevoFeriado({ fecha: '', motivo: '' });
      await loadFeriados();
      setMsg({ text: 'Día no laborable registrado', ok: true });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMsg({ text: detail || 'Error al registrar feriado', ok: false });
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {msg && (
        <div className={`xl:col-span-2 p-3 rounded-xl text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
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
        <form onSubmit={handleAddFeriado} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fecha</label>
            <input type="date" required value={nuevoFeriado.fecha} onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, fecha: e.target.value })} className="text-sm px-3 py-2 border rounded-xl" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Motivo</label>
            <input type="text" value={nuevoFeriado.motivo} onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, motivo: e.target.value })} placeholder="Ej. Feriado nacional" className="w-full text-sm px-3 py-2 border rounded-xl" />
          </div>
          <button type="submit" disabled={isSavingFeriado} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
            Agregar
          </button>
        </form>
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
                <button type="button" onClick={() => handleDeleteFeriado(f.id)} className="text-xs text-red-600 font-semibold">Eliminar</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
