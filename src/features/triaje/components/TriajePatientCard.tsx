import type { TriajePriorizadoItem } from '../../../services/api';
import { formatDateTime } from '../../../utils/date';
import { PRIMARY } from '../../../constants/theme';
import { buildTags, getNivelConfig, getScore } from '../constants/triajeConfig';

interface TriajePatientCardProps {
  paciente: TriajePriorizadoItem;
  reportLoadingId: number | null;
  onVerRecomendaciones: (pacienteId: number) => void;
  onVerClinicos: (p: TriajePriorizadoItem) => void;
  onDownloadReport: (pacienteId: number, dni: string) => void;
  onSendReport: (pacienteId: number) => void;
}

export default function TriajePatientCard({
  paciente: p,
  reportLoadingId,
  onVerRecomendaciones,
  onVerClinicos,
  onDownloadReport,
  onSendReport,
}: TriajePatientCardProps) {
  const score = getScore(p);
  const tags = buildTags(p);
  const cfg = getNivelConfig(p.nivel_urgencia);
  const acciones = p.acciones_urgentes || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
      <div className="md:w-36 flex-shrink-0 flex flex-col items-center justify-center p-5 border-b md:border-b-0 md:border-r border-gray-100" style={{ backgroundColor: cfg.bg }}>
        <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>{p.nivel_urgencia?.toUpperCase()}</span>
        <span className="text-4xl font-black" style={{ color: cfg.color }}>{score}</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase">SCORE</span>
      </div>
      <div className="flex-1 p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">{p.nombre} {p.apellidos}</h3>
            <p className="text-xs text-gray-500 font-medium">DNI {p.dni}{p.edad_gestacional_semanas ? ` · ${p.edad_gestacional_semanas} semanas de gestación` : ''}</p>
            <p className="text-[10px] text-gray-400 mt-1">Triaje: {formatDateTime(p.fecha_triage)}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
            {p.nivel_urgencia?.toUpperCase()} PRIORIDAD
          </span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">{tag}</span>
            ))}
          </div>
        )}
        {acciones.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Recomendaciones</p>
            <div className="flex flex-wrap gap-2">
              {acciones.map((acc) => (
                <span key={acc} className="text-xs font-semibold text-gray-700 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">{acc}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex md:flex-col items-center justify-center gap-2 p-4 border-t md:border-t-0 md:border-l border-gray-100 flex-shrink-0">
        <button type="button" onClick={() => onVerRecomendaciones(p.paciente_id)} className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm" style={{ backgroundColor: cfg.color }}>Ver recomendaciones</button>
        <button type="button" onClick={() => onVerClinicos(p)} className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Ver</button>
        <button type="button" onClick={() => onDownloadReport(p.paciente_id, p.dni)} disabled={reportLoadingId === p.paciente_id} className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 print:hidden">PDF</button>
        <button type="button" onClick={() => onSendReport(p.paciente_id)} disabled={reportLoadingId === p.paciente_id} className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 print:hidden" style={{ backgroundColor: PRIMARY }}>Enviar</button>
      </div>
    </div>
  );
}
