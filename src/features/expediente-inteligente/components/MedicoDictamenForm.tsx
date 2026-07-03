import { useEffect, useState } from 'react';
import { Loader2, Stethoscope } from 'lucide-react';
import {
  getPrediccionDictamen,
  guardarPrediccionDictamen,
  type PrediccionDictamenResponse,
} from '../../../services/api';
import { getApiErrorMessage } from '../../../services/client';
import { useUserRole } from '../../../hooks/useUserRole';

interface MedicoDictamenFormProps {
  prediccionId: number;
  probConsenso: number | null | undefined;
  semanasConsenso: number | null | undefined;
}

export default function MedicoDictamenForm({
  prediccionId,
  probConsenso,
  semanasConsenso,
}: MedicoDictamenFormProps) {
  const { isDoctor } = useUserRole();
  const [existing, setExisting] = useState<PrediccionDictamenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probPct, setProbPct] = useState('');
  const [semanas, setSemanas] = useState('');
  const [probRealPct, setProbRealPct] = useState('');
  const [semanasReal, setSemanasReal] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    setLoading(true);
    getPrediccionDictamen(prediccionId)
      .then((res) => {
        setExisting(res);
        if (res) {
          setProbPct(String(Math.round(res.prob_medico * 100)));
          setSemanas(String(res.semanas_medico));
          setProbRealPct(res.prob_real != null ? String(Math.round(res.prob_real * 100)) : '');
          setSemanasReal(res.semanas_real != null ? String(res.semanas_real) : '');
          setNotas(res.notas || '');
        }
      })
      .catch(() => setExisting(null))
      .finally(() => setLoading(false));
  }, [prediccionId]);

  if (!isDoctor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prob = Number(probPct);
    const sem = Number(semanas);
    if (Number.isNaN(prob) || prob < 0 || prob > 100 || Number.isNaN(sem) || sem < 20 || sem > 42) {
      setError('Probabilidad 0–100 % y semanas entre 20 y 42.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof guardarPrediccionDictamen>[1] = {
        prob_medico: prob / 100,
        semanas_medico: sem,
        notas: notas.trim() || undefined,
      };
      if (probRealPct !== '') {
        const pr = Number(probRealPct);
        if (!Number.isNaN(pr) && pr >= 0 && pr <= 100) payload.prob_real = pr / 100;
      }
      if (semanasReal !== '') {
        const sr = Number(semanasReal);
        if (!Number.isNaN(sr)) payload.semanas_real = sr;
      }
      const res = await guardarPrediccionDictamen(prediccionId, payload);
      setExisting(res);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar el dictamen.'));
    } finally {
      setSaving(false);
    }
  };

  const diffProb =
    existing?.diff_prob_consenso != null
      ? `${existing.diff_prob_consenso >= 0 ? '+' : ''}${(existing.diff_prob_consenso * 100).toFixed(1)} pp`
      : null;
  const diffSem =
    existing?.diff_semanas_consenso != null
      ? `${existing.diff_semanas_consenso >= 0 ? '+' : ''}${existing.diff_semanas_consenso} sem`
      : null;

  return (
    <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Stethoscope className="w-4 h-4 text-sky-700" />
        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Mi dictamen clínico</span>
      </div>
      <p className="text-[11px] text-gray-500">
        Registre su estimación de riesgo y semanas de parto. Opcionalmente el resultado real cuando se conozca.
        {probConsenso != null && (
          <> Consenso del modelo: <strong>{Math.round(probConsenso * 100)}%</strong>
            {semanasConsenso != null && <> · <strong>{semanasConsenso} sem</strong></>}.
          </>
        )}
      </p>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Probabilidad riesgo (%)</span>
              <input
                type="number" min={0} max={100} step={0.1} required
                value={probPct} onChange={(e) => setProbPct(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Semanas estimadas</span>
              <input
                type="number" min={20} max={42} required
                value={semanas} onChange={(e) => setSemanas(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Prob. real (%)</span>
              <input
                type="number" min={0} max={100} step={0.1} placeholder="Opcional"
                value={probRealPct} onChange={(e) => setProbRealPct(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Semanas reales</span>
              <input
                type="number" min={20} max={45} placeholder="Opcional"
                value={semanasReal} onChange={(e) => setSemanasReal(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </label>
          </div>
          <textarea
            value={notas} onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas del dictamen (opcional)" rows={2}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none"
          />
          {existing && (diffProb || diffSem) && (
            <p className="text-[10px] text-sky-800 bg-sky-50 rounded-lg px-3 py-2">
              Diferencia vs consenso: {diffProb}{diffProb && diffSem ? ' · ' : ''}{diffSem}
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit" disabled={saving}
            className="py-2 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#0369a1' }}
          >
            {saving ? 'Guardando...' : existing ? 'Actualizar dictamen' : 'Guardar dictamen'}
          </button>
        </form>
      )}
    </div>
  );
}
