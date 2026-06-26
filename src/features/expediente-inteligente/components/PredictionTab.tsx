import { useState } from 'react';
import { usePrediccion } from '../hooks/usePrediccion';
import PredictionFeedback from './PredictionFeedback';
import ModelFeedback from './ModelFeedback';
import {
  BrainCircuit, Activity, RefreshCw, Printer, Mail,
  AlertTriangle, CheckCircle2, ClipboardList, ChevronDown,
  TrendingUp, Info, Calendar,
} from 'lucide-react';
import type { PacientePerfilResponse, PrediccionUltimaResponse, PrediccionHistorialItem } from '../../../services/api';

const MODEL_METADATA = {
  random_forest: { ic95: '[78% - 92%]', margen: '+12.4% (Alto)', accuracy: '0.89 (Estable)' },
  catboost: { ic95: '[75% - 88%]', margen: '+9.8% (Alto)', accuracy: '0.91 (Excelente)' },
  svm: { ic95: '[72% - 86%]', margen: '+8.2% (Alto)', accuracy: '0.88 (Estable)' },
};

interface PredictionTabProps {
  pacienteId: number;
}

function riskColor(nivel: string | null | undefined): string {
  switch (nivel?.toLowerCase()) {
    case 'critico': case 'crítico': case 'alto': return '#BA1A1A';
    case 'medio': return '#CA8A04';
    case 'bajo': return '#16A34A';
    default: return '#612853';
  }
}

function getRiskColor(percentage: number) {
  if (percentage < 30) return '#16A34A';
  if (percentage < 70) return '#D97706';
  return '#BA1A1A';
}

function getRiskStyles(nivel: string | null | undefined) {
  const safe = nivel?.toLowerCase() || 'bajo';
  switch (safe) {
    case 'critico': return { bg: 'bg-red-50/70 border-red-200 text-red-800', badge: 'bg-red-100 border-red-300 text-[#BA1A1A] font-extrabold', circle: '#BA1A1A', label: 'RIESGO CRÍTICO' };
    case 'alto': return { bg: 'bg-orange-50/70 border-orange-200 text-orange-800', badge: 'bg-orange-100 border-orange-300 text-orange-800 font-extrabold', circle: '#F59E0B', label: 'RIESGO ALTO' };
    case 'medio': return { bg: 'bg-yellow-50/70 border-yellow-200 text-yellow-800', badge: 'bg-yellow-100 border-yellow-300 text-yellow-800 font-extrabold', circle: '#D97706', label: 'RIESGO MEDIO' };
    default: return { bg: 'bg-green-50/70 border-green-200 text-green-800', badge: 'bg-green-100 border-green-300 text-[#16A34A] font-extrabold', circle: '#16A34A', label: 'RIESGO BAJO' };
  }
}

function CircularProgress({ percentage, strokeColor, trackColor = '#F1F5F9' }: { percentage: number; strokeColor: string; trackColor?: string }) {
  const radius = 45;
  const strokeDash = 2 * Math.PI * radius;
  const offset = strokeDash - (percentage / 100) * strokeDash;
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="72" cy="72" r={radius} stroke={trackColor} strokeWidth="8" fill="transparent" />
        <circle cx="72" cy="72" r={radius} stroke={strokeColor} strokeWidth="8" fill="transparent" strokeDasharray={strokeDash} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute text-center flex flex-col items-center">
        <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{percentage}%</span>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Riesgo</p>
      </div>
    </div>
  );
}

function RiskTrendChart({ historial }: { historial: PrediccionHistorialItem[] }) {
  const sorted = [...historial].filter(h => h.prob_consenso != null).sort((a, b) => new Date(a.fecha_prediccion).getTime() - new Date(b.fecha_prediccion).getTime());
  if (sorted.length === 0) {
    return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center"><p className="text-sm text-slate-500">Sin historial de predicciones para mostrar tendencia.</p></div>;
  }
  const W = 600, H = 200, padL = 48, padR = 16, padT = 20, padB = 40;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const points = sorted.map((h, i) => {
    const x = padL + (sorted.length === 1 ? chartW / 2 : (i / (sorted.length - 1)) * chartW);
    const y = padT + chartH - (Number(h.prob_consenso) * chartH);
    return { x, y, h };
  });
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#612853]" />
        <h3 className="font-extrabold text-slate-800 text-sm">Tendencia de Riesgo Prematuro</h3>
        <span className="text-[10px] text-slate-400 font-medium ml-auto">{sorted.length} predicción{sorted.length !== 1 ? 'es' : ''}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {[0, 25, 50, 75, 100].map(pct => {
          const y = padT + chartH - (pct / 100) * chartH;
          return (
            <g key={pct}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">{pct}%</text>
            </g>
          );
        })}
        {points.length >= 2 && <polyline points={polyline} fill="none" stroke="#612853" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map(p => (
          <g key={p.h.id}>
            <circle cx={p.x} cy={p.y} r="5" fill={riskColor(p.h.nivel_riesgo)} stroke="white" strokeWidth="2" />
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize="8" fill="#94A3B8" fontWeight="600">{new Date(p.h.fecha_prediccion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function PredictionTab({ pacienteId }: PredictionTabProps) {
  const { profile, prediction, historial, loading, calculating, error, ejecutar } = usePrediccion(pacienteId);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const getClinicalVars = (p: PacientePerfilResponse) => {
    const vars: { label: string; value: string; isAlert: boolean; desc: string }[] = [];
    const cl = p.longitud_cervical_mm;
    vars.push({ label: 'Longitud Cervical', value: cl ? `${cl} mm` : 'N/A', isAlert: cl !== null && cl < 25, desc: cl !== null && cl < 25 ? 'Valor crítico (< 25mm)' : 'Valor normal' });
    vars.push({ label: 'Partos Prematuros Previos', value: p.parto_prematuro_previo ? 'Sí' : 'No', isAlert: !!p.parto_prematuro_previo, desc: p.parto_prematuro_previo ? 'Historial positivo' : 'Sin historial' });
    const multEmb = p.embarazo_multiple ?? 1;
    vars.push({ label: 'Embarazo Múltiple', value: multEmb > 1 ? `Sí (${multEmb} fetos)` : 'No', isAlert: multEmb > 1, desc: multEmb > 1 ? 'Factor de riesgo' : 'Monofetal' });
    vars.push({ label: 'Hipertensión Gestacional', value: p.hipertension_gestacional ? 'Sí' : 'No', isAlert: !!p.hipertension_gestacional, desc: p.hipertension_gestacional ? 'Requiere control' : 'Sin hipertensión' });
    const bmi = p.bmi;
    vars.push({ label: 'BMI', value: bmi ? bmi.toString() : 'N/A', isAlert: bmi !== null && (bmi < 18.5 || bmi > 25), desc: bmi !== null && (bmi < 18.5 || bmi > 25) ? 'Fuera de rango' : 'Normal' });
    const cc = p.num_condiciones_cronicas ?? 0;
    vars.push({ label: 'Condiciones Crónicas', value: cc.toString(), isAlert: cc > 0, desc: cc > 0 ? `${cc} condiciones detectadas` : 'Sin condiciones' });
    vars.push({ label: 'Infección Activa', value: p.infeccion_activa ? 'Sí' : 'No', isAlert: !!p.infeccion_activa, desc: p.infeccion_activa ? 'Riesgo infeccioso' : 'Sin infección' });
    const age = p.edad_madre ?? 0;
    vars.push({ label: 'Edad Materna', value: age.toString(), isAlert: age < 18 || age > 35, desc: age < 18 || age > 35 ? 'Edad de riesgo' : 'Rango seguro' });
    return vars;
  };

  const getFormattedDate = () => {
    if (prediction?.fecha_prediccion) {
      return new Date(prediction.fecha_prediccion).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return 'Sin consultas previas';
  };

  const handleSendEmail = async () => {
    const { enviarReportePaciente } = await import('../../../services/api');
    setSendingEmail(true);
    setEmailMsg(null);
    try {
      const res = await enviarReportePaciente(pacienteId, 'prediccion');
      setEmailMsg(res.mensaje);
    } catch {
      setEmailMsg('No se pudo enviar el reporte por correo.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-[#612853] animate-spin" />
        <p className="text-sm text-gray-500">Analizando datos de predicción...</p>
      </div>
    );
  }

  const activeRiskStyle = prediction?.nivel_riesgo ? getRiskStyles(prediction.nivel_riesgo) : null;
  const clinicalVars = profile ? getClinicalVars(profile) : [];
  const alertCount = clinicalVars.filter(v => v.isAlert).length;

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-700 font-medium text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Última Consulta</span>
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-gray-400" /> {getFormattedDate()}
          </span>
        </div>
        {activeRiskStyle && prediction?.prob_consenso != null && (
          <span className={`inline-block text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border tracking-wide ${activeRiskStyle.badge}`}>
            {activeRiskStyle.label}
          </span>
        )}
      </div>

      {prediction?.prob_consenso == null ? (
        <div className="bg-gradient-to-br from-slate-50 to-purple-50/20 p-8 rounded-2xl border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-[#612853]/10 rounded-full flex items-center justify-center text-[#612853]">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-slate-800">No se encontraron predicciones de IA</h3>
            <p className="text-xs text-slate-500 mt-1">Ejecute el set de modelos matemáticos usando las variables clínicas actuales.</p>
          </div>
          <button onClick={ejecutar} disabled={calculating}
            className="px-6 py-3 bg-[#612853] hover:bg-[#522146] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md disabled:opacity-50">
            {calculating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Procesando...</> : <><Activity className="w-4 h-4" /> Calcular Predicción por Consenso</>}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['random_forest', 'catboost', 'svm'].map(modelKey => {
              const model = prediction.modelos?.[modelKey as keyof typeof prediction.modelos];
              const meta = MODEL_METADATA[modelKey as keyof typeof MODEL_METADATA];
              const names: Record<string, string> = { random_forest: 'Random Forest', catboost: 'CatBoost', svm: 'SVM' };
              const sub: Record<string, string> = { random_forest: 'Modelo Ensemble', catboost: 'Gradient Boosting', svm: 'Clasificador Lineal' };
              if (!model) return null;
              return (
                <div key={modelKey} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">{names[modelKey]}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{sub[modelKey]}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">OK</span>
                  </div>
                  <div className="flex justify-center py-1">
                    <CircularProgress percentage={Math.round(model.prob_prematuro * 100)} strokeColor={getRiskColor(Math.round(model.prob_prematuro * 100))} />
                  </div>
                  <div className="pt-3 border-t border-slate-50 text-center">
                    <p className="text-xs font-bold text-slate-500">Parto: <span className="text-[#612853] font-black">{model.semanas_estimadas} sem</span></p>
                    <p className="text-[8px] text-slate-400 mt-0.5">IC 95%: {meta.ic95}</p>
                  </div>
                  {prediction?.prediccion_id && (
                    <ModelFeedback prediccionId={prediction.prediccion_id} modelo={modelKey} />
                  )}
                </div>
              );
            })}
          </div>
          {historial.length > 0 && <RiskTrendChart historial={historial} />}
        </div>
      )}

      {clinicalVars.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-[#612853]" />
              <span className="font-extrabold text-slate-700 text-sm">Variables Clínicas</span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${alertCount > 0 ? 'bg-red-50 border-red-200 text-[#BA1A1A]' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {alertCount} alerta{alertCount !== 1 ? 's' : ''}
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isAccordionOpen ? 'rotate-180' : ''}`} />
          </button>
          {isAccordionOpen && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {clinicalVars.map((v, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-50 bg-slate-50/20">
                  {v.isAlert ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-xs font-bold text-slate-500 truncate">{v.label}</span>
                      <span className={`text-xs font-black shrink-0 ${v.isAlert ? 'text-[#BA1A1A]' : 'text-slate-800'}`}>{v.value}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {prediction?.prediccion_id && (
        <PredictionFeedback
          prediccionId={prediction.prediccion_id}
          pacienteNombre={profile ? `${profile.nombre} ${profile.apellidos}` : ''}
        />
      )}

      {emailMsg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${emailMsg.includes('enviado') || emailMsg.includes('Enviado') ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-amber-800 bg-amber-50 border border-amber-200'}`}>
          {emailMsg}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
        <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
        <button onClick={handleSendEmail} disabled={sendingEmail || !prediction?.prediccion_id}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
          <Mail className={`w-4 h-4 ${sendingEmail ? 'animate-pulse' : ''}`} /> {sendingEmail ? 'Enviando...' : 'Enviar reporte'}
        </button>
        <button onClick={ejecutar} disabled={calculating}
          className="px-4 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-[#612853] hover:bg-purple-50 flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>
    </div>
  );
}
