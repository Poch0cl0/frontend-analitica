import { useState } from 'react';
import { useTriaje } from '../hooks/useTriaje';
import { DcAtenderReadonlyView, type DcAtenderForm } from '../../../components/DatosClinicosAtenderForm';
import { loadAtenderFormForPaciente } from '../../../utils/atenderFormLoader';
import { exportarReportePaciente, enviarReportePaciente } from '../../../services/api';
import { formatDateTime } from '../../../utils/date';
import { X, FileDown, Mail, RefreshCw, Eye } from 'lucide-react';

const NIVELES_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  rojo: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'CRÍTICO' },
  naranja: { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', label: 'ALTO' },
  amarillo: { color: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A', label: 'MODERADO' },
  verde: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', label: 'BAJO' },
};

interface TriageTabProps {
  pacienteId: number;
}

export default function TriageTab({ pacienteId }: TriageTabProps) {
  const { selectedItem, loading, syncing, error, sincronizar } = useTriaje(pacienteId);
  const [clinicoModal, setClinicoModal] = useState<{ form: DcAtenderForm | null; loading: boolean } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  const handleVerClinicos = async () => {
    setClinicoModal({ form: null, loading: true });
    try {
      const loaded = await loadAtenderFormForPaciente(pacienteId);
      setClinicoModal({ form: loaded.form, loading: false });
    } catch {
      setClinicoModal(null);
      alert('No se pudieron cargar los datos clínicos.');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    setReportLoading(true);
    try {
      const blob = await exportarReportePaciente(pacienteId, 'pdf', 'triaje');
      downloadBlob(blob, `triaje_${pacienteId}.pdf`);
    } catch {
      setReportMsg('No se pudo generar el reporte.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setReportLoading(true);
    setReportMsg(null);
    try {
      const res = await enviarReportePaciente(pacienteId, 'triaje');
      setReportMsg(res.mensaje);
    } catch {
      setReportMsg('Error al enviar el reporte.');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#612853] animate-spin" />
        <p className="text-sm text-gray-500">Cargando datos de triaje...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-700 text-sm flex items-center gap-2">
        <span>{error}</span>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-gray-500 font-medium">Este paciente no tiene datos de triaje registrados.</p>
        <p className="text-xs text-gray-400">Los pacientes aparecen automáticamente después de tener una predicción de riesgo.</p>
        <button onClick={sincronizar} disabled={syncing}
          className="px-5 py-2.5 bg-[#612853] text-white text-xs font-bold rounded-xl hover:opacity-90 transition flex items-center gap-2 mx-auto disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar triaje
        </button>
      </div>
    );
  }

  const nivel = selectedItem.nivel_urgencia?.toLowerCase() || 'verde';
  const cfg = NIVELES_CONFIG[nivel] || NIVELES_CONFIG.verde;
  const score = selectedItem.score_formula_ponderada != null
    ? Math.round(Number(selectedItem.score_formula_ponderada) * 100)
    : selectedItem.prob_consenso != null
      ? Math.round(Number(selectedItem.prob_consenso) * 100)
      : 0;
  const tags: string[] = [];
  if (selectedItem.edad_gestacional_semanas) tags.push(`${selectedItem.edad_gestacional_semanas} semanas de gestación`);
  if (selectedItem.bmi != null) tags.push(`IMC ${Number(selectedItem.bmi).toFixed(1)}`);
  if (selectedItem.num_condiciones_cronicas && selectedItem.num_condiciones_cronicas > 0) tags.push(`${selectedItem.num_condiciones_cronicas} condición(es) crónica(s)`);
  if (selectedItem.prob_consenso != null) tags.push(`Riesgo prematuro ${Math.round(Number(selectedItem.prob_consenso) * 100)}%`);
  const acciones = selectedItem.acciones_urgentes || [];

  return (
    <div className="space-y-5">
      {reportMsg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${reportMsg.includes('enviado') || reportMsg.includes('Enviado') ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-amber-800 bg-amber-50 border border-amber-200'}`}>
          {reportMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-32 flex-shrink-0 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100" style={{ backgroundColor: cfg.bg }}>
            <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>{nivel.toUpperCase()}</span>
            <span className="text-4xl font-black" style={{ color: cfg.color }}>{score}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">SCORE</span>
          </div>
          <div className="flex-1 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{selectedItem.nombre} {selectedItem.apellidos}</h3>
                <p className="text-xs text-gray-500">DNI {selectedItem.dni}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Triaje generado: {formatDateTime(selectedItem.fecha_triage)}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border" style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
                {cfg.label} PRIORIDAD
              </span>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">{tag}</span>
                ))}
              </div>
            )}

            {acciones.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Recomendaciones</p>
                <div className="flex flex-wrap gap-2">
                  {acciones.map(acc => (
                    <span key={acc} className="flex items-center gap-1 text-xs font-semibold text-gray-700 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                      <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <button onClick={handleVerClinicos} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
          <Eye className="w-4 h-4" /> Ver datos clínicos
        </button>
        <div className="flex gap-2">
          <button onClick={handleDownloadPDF} disabled={reportLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleSendEmail} disabled={reportLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#612853' }}>
            <Mail className="w-4 h-4" /> Enviar
          </button>
          <button onClick={sincronizar} disabled={syncing} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar
          </button>
        </div>
      </div>

      {clinicoModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setClinicoModal(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#612853' }}>
              <div className="text-white">
                <h3 className="font-extrabold text-lg">Datos Clínicos del Paciente</h3>
                <p className="text-xs text-fuchsia-200">{selectedItem.nombre} {selectedItem.apellidos} · DNI {selectedItem.dni}</p>
              </div>
              <button onClick={() => setClinicoModal(null)} className="text-fuchsia-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {clinicoModal.loading ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#612853] animate-spin mx-auto" />
                  <p className="text-sm text-gray-500 mt-3">Cargando datos clínicos...</p>
                </div>
              ) : clinicoModal.form ? (
                <DcAtenderReadonlyView form={clinicoModal.form} />
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No hay datos clínicos registrados.</p>
              )}
              <div className="pt-5 mt-2 border-t border-gray-100 flex justify-end">
                <button onClick={() => setClinicoModal(null)} className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
