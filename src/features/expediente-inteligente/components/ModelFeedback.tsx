import { useState, useEffect } from 'react';
import { getPrediccionFeedback, guardarPrediccionFeedback } from '../../../services/api';
import type { PrediccionFeedbackResponse } from '../../../services/api';
import { ThumbsUp, ThumbsDown, Loader2, MessageSquare } from 'lucide-react';

interface ModelFeedbackProps {
  prediccionId: number;
  modelo: string;
}

export default function ModelFeedback({ prediccionId, modelo }: ModelFeedbackProps) {
  const [existing, setExisting] = useState<PrediccionFeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voto, setVoto] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPrediccionFeedback(prediccionId, modelo)
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
  }, [prediccionId, modelo]);

  const handleSubmit = async () => {
    if (voto === null) return;
    setSaving(true);
    try {
      const res = await guardarPrediccionFeedback(prediccionId, {
        voto_correcta: voto,
        comentario: comentario.trim() || undefined,
        modelo,
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
      <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] ${
        existing.voto_correcta ? 'bg-emerald-50' : 'bg-red-50'
      }`}>
        <div className="flex items-center gap-1.5">
          {existing.voto_correcta
            ? <ThumbsUp className="w-3 h-3 text-emerald-600" />
            : <ThumbsDown className="w-3 h-3 text-red-600" />
          }
          <span className={`font-semibold ${existing.voto_correcta ? 'text-emerald-700' : 'text-red-700'}`}>
            {existing.voto_correcta ? 'Correcto' : 'Incorrecto'}
          </span>
        </div>
        {existing.comentario && (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 underline">
            {expanded ? 'ocultar' : 'ver comentario'}
          </button>
        )}
        {expanded && existing.comentario && (
          <p className="text-gray-500 mt-1 col-span-2">{existing.comentario}</p>
        )}
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-slate-50">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { setVoto(true); setExpanded(true); }}
          className={`p-1.5 rounded-lg transition ${
            voto === true ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
          }`}
          title="Correcta"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => { setVoto(false); setExpanded(true); }}
          className={`p-1.5 rounded-lg transition ${
            voto === false ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          }`}
          title="Incorrecta"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        <span className="text-[9px] text-gray-400 font-medium ml-1">¿Acertó?</span>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Comentario clínico..."
            rows={2}
            className="w-full text-[11px] px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-fuchsia-300 resize-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={voto === null || saving}
              className="py-1 px-3 rounded-lg text-[10px] font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#612853' }}
            >
              {saving ? 'Guardando...' : 'Votar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
