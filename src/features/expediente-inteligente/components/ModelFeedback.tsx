import { useState, useEffect } from 'react';
import { getPrediccionFeedback, guardarPrediccionFeedback } from '../../../services/api';
import type { PrediccionFeedbackResponse } from '../../../services/api';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

export type FeedbackAspecto = 'probabilidad' | 'semanas';

interface ModelFeedbackProps {
  prediccionId: number;
  modelo?: string;
  aspecto: FeedbackAspecto;
  pregunta: string;
}

export default function ModelFeedback({
  prediccionId,
  modelo,
  aspecto,
  pregunta,
}: ModelFeedbackProps) {
  const [existing, setExisting] = useState<PrediccionFeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voto, setVoto] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPrediccionFeedback(prediccionId, modelo, aspecto)
      .then((res) => {
        setExisting(res);
        if (res) {
          setVoto(res.voto_correcta);
          setComentario(res.comentario || '');
          setSaved(true);
        } else {
          setVoto(null);
          setComentario('');
          setSaved(false);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [prediccionId, modelo, aspecto]);

  const handleSubmit = async () => {
    if (voto === null) return;
    setSaving(true);
    try {
      const res = await guardarPrediccionFeedback(prediccionId, {
        voto_correcta: voto,
        comentario: comentario.trim() || undefined,
        modelo,
        aspecto,
      });
      setExisting(res);
      setSaved(true);
      setExpanded(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-2"><Loader2 className="w-3 h-3 animate-spin text-gray-300" /></div>;
  }

  if (saved && existing) {
    return (
      <div className={`rounded-lg px-2 py-1.5 text-[10px] ${existing.voto_correcta ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {existing.voto_correcta
              ? <ThumbsUp className="w-3 h-3 text-emerald-600 shrink-0" />
              : <ThumbsDown className="w-3 h-3 text-red-600 shrink-0" />}
            <span className={`font-semibold truncate ${existing.voto_correcta ? 'text-emerald-700' : 'text-red-700'}`}>
              {pregunta}: {existing.voto_correcta ? 'De acuerdo' : 'No de acuerdo'}
            </span>
          </div>
          {existing.comentario && (
            <button type="button" onClick={() => setExpanded(!expanded)} className="text-gray-400 underline shrink-0">
              {expanded ? 'ocultar' : 'motivo'}
            </button>
          )}
        </div>
        {expanded && existing.comentario && (
          <p className="text-gray-500 mt-1">{existing.comentario}</p>
        )}
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-slate-50 space-y-2">
      <p className="text-[9px] text-gray-500 font-medium">{pregunta}</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { setVoto(true); setExpanded(true); }}
          className={`p-1.5 rounded-lg transition ${
            voto === true ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
          }`}
          title="De acuerdo"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => { setVoto(false); setExpanded(true); }}
          className={`p-1.5 rounded-lg transition ${
            voto === false ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          }`}
          title="No de acuerdo"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        <span className="text-[9px] text-gray-400">Sí / No</span>
      </div>
      {expanded && (
        <div className="space-y-2">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Por qué? (opcional)"
            rows={2}
            className="w-full text-[11px] px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={voto === null || saving}
            className="py-1 px-3 rounded-lg text-[10px] font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: '#612853' }}
          >
            {saving ? 'Guardando...' : 'Registrar voto'}
          </button>
        </div>
      )}
    </div>
  );
}
