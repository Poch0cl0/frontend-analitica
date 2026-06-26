import { useState, useEffect } from 'react';
import { getPrediccionFeedback, guardarPrediccionFeedback } from '../../../services/api';
import type { PrediccionFeedbackResponse } from '../../../services/api';
import { ThumbsUp, ThumbsDown, Send, Loader2, MessageSquare } from 'lucide-react';

interface PredictionFeedbackProps {
  prediccionId: number;
  pacienteNombre: string;
}

export default function PredictionFeedback({ prediccionId, pacienteNombre }: PredictionFeedbackProps) {
  const [existing, setExisting] = useState<PrediccionFeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voto, setVoto] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPrediccionFeedback(prediccionId)
      .then(res => {
        setExisting(res);
        if (res) {
          setVoto(res.voto_correcta);
          setComentario(res.comentario || '');
          setSaved(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prediccionId]);

  const handleSubmit = async () => {
    if (voto === null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await guardarPrediccionFeedback(prediccionId, {
        voto_correcta: voto,
        comentario: comentario.trim() || undefined,
      });
      setExisting(res);
      setSaved(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg).join(', ')
        : detail || 'Error al guardar la retroalimentación.';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (saved && existing) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Retroalimentación</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
            existing.voto_correcta
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-red-700 bg-red-50 border-red-200'
          }`}>
            {existing.voto_correcta ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
            {existing.voto_correcta ? 'Correcta' : 'Incorrecta'}
          </span>
        </div>
        {existing.comentario && (
          <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100">
            {existing.comentario}
          </p>
        )}
        <p className="text-[10px] text-gray-400">
          {new Date(existing.created_at).toLocaleDateString('es-PE', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-fuchsia-100 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-fuchsia-700" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Retroalimentación del Médico</span>
      </div>
      <p className="text-xs text-gray-500">
        Como médico responsable de {pacienteNombre}, ¿considera que la predicción de riesgo es acertada?
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { setVoto(true); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
            voto === true
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
              : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-700'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${voto === true ? 'fill-emerald-500' : ''}`} />
          Correcta
        </button>
        <button
          type="button"
          onClick={() => { setVoto(false); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
            voto === false
              ? 'bg-red-50 border-red-300 text-red-800 shadow-sm'
              : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-700'
          }`}
        >
          <ThumbsDown className={`w-4 h-4 ${voto === false ? 'fill-red-500' : ''}`} />
          Incorrecta
        </button>
      </div>

      <div>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="Comentario opcional: describa su criterio clínico..."
          rows={3}
          className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-300 resize-none"
        />
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={voto === null || saving}
          className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 shadow-sm"
          style={{ backgroundColor: '#612853' }}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Send className="w-4 h-4" /> Enviar Retroalimentación</>}
        </button>
      </div>
    </div>
  );
}
