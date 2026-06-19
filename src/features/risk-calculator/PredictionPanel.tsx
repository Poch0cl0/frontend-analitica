import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Play, ClipboardList, ChevronDown, Printer, Save, ArrowRight } from 'lucide-react';

// 1. CONTRATO DE INTERFACES (TypeScript Estricto)
interface ModelMetrics {
  prob_prematuro: number;
  semanas_estimadas: number;
}

interface PredictionData {
  prediccion_id: string;
  prob_consenso: number;
  nivel_riesgo: 'bajo' | 'medio' | 'alto' | 'critico';
  modelos: {
    random_forest: ModelMetrics;
    catboost: ModelMetrics;
    svm: ModelMetrics;
  };
}

export const PredictionPanel: React.FC = () => {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);

  // ID de paciente hardcodeado para la demo/video, luego vendrá por URL/Params
  const pacienteId = "1"; 

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/prediccion/paciente/${pacienteId}/ultima`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar la analítica predictiva');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-600 font-medium">Cargando modelos analíticos de IA...</div>;
  if (error) return <div className="p-4 mx-6 my-4 bg-red-50 border-l-4 border-red-500 text-red-700 font-medium">{error}</div>;
  if (!data) return null;

  // MAPEÓ SEMÁNTICO DE COLORES (Según tu Figma)
  const riskStyles = {
    critico: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800 border-red-300' },
    alto: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
    medio: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    bajo: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800 border-green-300' },
  }[data.nivel_riesgo];

  // COMPONENTE REUTILIZABLE PARA LOS CÍRCULOS SVG (Evita re-renders y librerías pesadas)
  const CircularProgress = ({ percentage, colorClass }: { percentage: number; colorClass: string }) => {
    const strokeDash = 2 * Math.PI * 40;
    const offset = strokeDash - (percentage / 100) * strokeDash;
    return (
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="40" stroke="#F1F5F9" strokeWidth="8" fill="transparent" />
          <circle cx="64" cy="64" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
            className={colorClass} strokeDasharray={strokeDash} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute text-center">
          <span className="text-2xl font-bold text-slate-800">{percentage}%</span>
          <p className="text-[10px] font-bold uppercase text-slate-400">Riesgo</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 font-sans">
      
      {/* HEADER PRINCIPAL (Figma: Selector de paciente + Consenso integrado) */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 bg-purple-50 p-3 rounded-xl border border-purple-100 w-full md:w-auto">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">LM</div>
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              Lucía Mendez <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">32 semanas</span>
            </h2>
            <p className="text-xs font-semibold text-rose-600">Riesgo Consenso Calculado: {(data.prob_consenso * 100).toFixed(0)}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8 w-full md:w-auto justify-end">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Última Consulta</span>
            <span className="text-sm font-semibold text-slate-700">Ayer, 14:20</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Riesgo</span>
            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-md border ${riskStyles.badge}`}>
              Riesgo {data.nivel_riesgo}
            </span>
          </div>
        </div>
      </div>

      {/* GRID DE MODELOS MATEMÁTICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Random Forest */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-800">Random Forest</h3>
              <p className="text-[10px] text-slate-400 font-medium">MODELO ENSEMBLE</p>
            </div>
            <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">Completado</span>
          </div>
          <div className="flex justify-center py-2">
            <CircularProgress percentage={Math.round(data.modelos.random_forest.prob_prematuro * 100)} colorClass="text-rose-600" />
          </div>
          <p className="text-center text-xs font-semibold text-slate-500">Semanas Estimadas Parto: <span className="text-slate-800 font-bold">{data.modelos.random_forest.semanas_estimadas}</span></p>
        </div>

        {/* CatBoost */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800">CatBoost</h3>
            <p className="text-[10px] text-slate-400 font-medium">GRADIENT BOOSTING</p>
          </div>
          <div className="flex justify-center py-2">
            <CircularProgress percentage={Math.round(data.modelos.catboost.prob_prematuro * 100)} colorClass="text-amber-500" />
          </div>
          <p className="text-center text-xs font-semibold text-slate-500">Semanas Estimadas Parto: <span className="text-slate-800 font-bold">{data.modelos.catboost.semanas_estimadas}</span></p>
        </div>

        {/* SVM Lineal */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800">SVM Lineal</h3>
            <p className="text-[10px] text-slate-400 font-medium">SUPPORT VECTOR MACHINE</p>
          </div>
          <div className="flex justify-center py-2">
            <CircularProgress percentage={Math.round(data.modelos.svm.prob_prematuro * 100)} colorClass="text-rose-600" />
          </div>
          <p className="text-center text-xs font-semibold text-slate-500">Semanas Estimadas Parto: <span className="text-slate-800 font-bold">{data.modelos.svm.semanas_estimadas}</span></p>
        </div>
      </div>

      {/* ACORDEÓN: RESUMEN DE DATOS DE ENTRADA */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => setIsAccordionOpen(!isAccordionOpen)} 
          className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-purple-700" />
            <span className="font-bold text-slate-700 text-sm">Resumen de Datos de Entrada</span>
            <span className="text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full">
              Variables Clínicas Sincronizadas
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isAccordionOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isAccordionOpen && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-white text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">⚠️ Longitud Cervical</span>
              <span className="font-bold text-slate-800">18 mm</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">⚠️ Partos Prematuros Previos</span>
              <span className="font-bold text-slate-800">1 (Semana 34)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-green-600 font-medium">✅ Embarazo Múltiple</span>
              <span className="font-bold text-slate-800">No</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">⚠️ Hipertensión Gestacional</span>
              <span className="font-bold text-slate-800">Sí (Controlada)</span>
            </div>
          </div>
        )}
      </div>

      {/* ACCIONES INFERIORES */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
        <button className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir Reporte
        </button>
        <button className="w-full sm:w-auto px-5 py-2.5 bg-white border border-purple-200 rounded-xl text-purple-700 text-xs font-bold hover:bg-purple-50 transition flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> Guardar Predicción
        </button>
        <button className="w-full sm:w-auto px-6 py-2.5 bg-purple-900 text-white text-xs font-bold rounded-xl hover:bg-purple-950 transition flex items-center justify-center gap-2">
          Ir a Recomendaciones <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};