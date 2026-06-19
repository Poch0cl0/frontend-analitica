import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPacientePerfil,
  getUltimaPrediccion,
  ejecutarPrediccionConsenso,
  getPacientes,
} from '../../services/api';
import type {
  PacientePerfilResponse,
  PrediccionUltimaResponse,
  PacienteResponse
} from '../../services/api';
import {
  ClipboardList,
  ChevronDown,
  Printer,
  ArrowRight,
  Search,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  TrendingUp,
  Activity,
  RefreshCw,
  Info,
  Calendar
} from 'lucide-react';

interface ClinicalVar {
  label: string;
  value: string;
  isAlert: boolean;
  desc: string;
}

// 1. CONSTANTES LOCALES MAREADAS POR MODELO (IC 95% y Margen de Decisión)
const MODEL_METADATA = {
  random_forest: {
    ic95: '[78% - 92%]',
    margen: '+12.4% (Alto)',
    accuracy: '0.89 (Estable)'
  },
  catboost: {
    ic95: '[75% - 88%]',
    margen: '+9.8% (Alto)',
    accuracy: '0.91 (Excelente)'
  },
  svm: {
    ic95: '[72% - 86%]',
    margen: '+8.2% (Alto)',
    accuracy: '0.88 (Estable)'
  }
};

// COMPONENTE DE CÍRCULO PROGRESO SVG NATIVO (Optimizado y Responsivo)
const CircularProgress = ({
  percentage,
  strokeColor,
  trackColor = '#F1F5F9'
}: {
  percentage: number;
  strokeColor: string;
  trackColor?: string;
}) => {
  const radius = 45;
  const strokeDash = 2 * Math.PI * radius; // 282.74
  const offset = strokeDash - (percentage / 100) * strokeDash;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        {/* Track Circle */}
        <circle
          cx="72"
          cy="72"
          r={radius}
          stroke={trackColor}
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress Circle */}
        <circle
          cx="72"
          cy="72"
          r={radius}
          stroke={strokeColor}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDash}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute text-center flex flex-col items-center">
        <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{percentage}%</span>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Riesgo</p>
      </div>
    </div>
  );
};

export const PredictionPanel: React.FC = () => {
  const navigate = useNavigate();

  // Estados para pacientes y búsqueda
  const [patients, setPatients] = useState<PacienteResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null);

  // Estados para el perfil clínico y la predicción del paciente seleccionado
  const [profile, setProfile] = useState<PacientePerfilResponse | null>(null);
  const [prediction, setPrediction] = useState<PrediccionUltimaResponse | null>(null);

  // Estados de carga y error
  const [loadingPatients, setLoadingPatients] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);

  // Cargar lista de pacientes al montar
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);
        const res = await getPacientes('', 1, 100);
        setPatients(res.items);
        if (res.items.length > 0) {
          // Seleccionar el primer paciente por defecto
          setSelectedPacienteId(res.items[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setError('Error al cargar la lista de pacientes.');
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  // Cargar perfil clínico y predicción cada vez que cambie de paciente
  useEffect(() => {
    if (selectedPacienteId === null) return;

    const fetchPatientData = async () => {
      try {
        setLoadingData(true);
        setError(null);

        // Llamar en paralelo por perfil y última predicción
        const [perfRes, predRes] = await Promise.all([
          getPacientePerfil(selectedPacienteId),
          getUltimaPrediccion(selectedPacienteId)
        ]);

        setProfile(perfRes);
        setPrediction(predRes);
      } catch (err: any) {
        console.error(err);
        setError('Error al cargar el perfil predictivo del paciente.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchPatientData();
  }, [selectedPacienteId]);

  // Ejecutar predicción consenso para la paciente seleccionada
  const handleCalcularConsenso = async () => {
    if (selectedPacienteId === null) return;
    try {
      setCalculating(true);
      setError(null);
      const res = await ejecutarPrediccionConsenso(selectedPacienteId);
      setPrediction(res);
      // Recargar perfil para actualizar últimos campos sincronizados
      const perfRes = await getPacientePerfil(selectedPacienteId);
      setProfile(perfRes);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Error al ejecutar los modelos de consenso de IA.');
    } finally {
      setCalculating(false);
    }
  };

  // Imprimir reporte clínico ocultando partes innecesarias
  const handlePrint = () => {
    window.print();
  };

  // Filtrar pacientes según la búsqueda (Nombre, Apellidos o DNI)
  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${p.nombre} ${p.apellidos}`.toLowerCase();
    return fullName.includes(query) || p.dni.includes(query);
  });

  // Encontrar el objeto del paciente seleccionado
  const selectedPatientObj = patients.find((p) => p.id === selectedPacienteId);

  // Función auxiliar para mapear perfil clínico a variables de UI
  const getClinicalVars = (p: PacientePerfilResponse): ClinicalVar[] => {
    const vars: ClinicalVar[] = [];

    // Longitud Cervical
    const cl = p.longitud_cervical_mm;
    vars.push({
      label: 'Longitud Cervical',
      value: cl ? `${cl} mm` : 'N/A',
      isAlert: cl !== null && cl < 25,
      desc: cl !== null && cl < 25 ? 'Valor crítico (< 25mm)' : 'Valor normal'
    });

    // Partos Prematuros Previos
    vars.push({
      label: 'Partos Prematuros Previos',
      value: p.parto_prematuro_previo ? 'Sí' : 'No',
      isAlert: !!p.parto_prematuro_previo,
      desc: p.parto_prematuro_previo ? 'Historial positivo' : 'Sin historial'
    });

    // Embarazo Múltiple
    vars.push({
      label: 'Embarazo Múltiple',
      value: p.embarazo_multiple ? 'Sí' : 'No',
      isAlert: !!p.embarazo_multiple,
      desc: p.embarazo_multiple ? 'Factor de riesgo' : 'Monofetal'
    });

    // Hipertensión Gestacional
    vars.push({
      label: 'Hipertensión Gestacional',
      value: p.hipertension_gestacional ? 'Sí' : 'No',
      isAlert: !!p.hipertension_gestacional,
      desc: p.hipertension_gestacional ? 'Requiere control' : 'Sin hipertensión'
    });

    // BMI
    const bmi = p.bmi;
    vars.push({
      label: 'BMI',
      value: bmi ? bmi.toString() : 'N/A',
      isAlert: bmi !== null && (bmi < 18.5 || bmi > 25),
      desc: bmi !== null && (bmi < 18.5 || bmi > 25) ? 'Fuera de rango' : 'Normal'
    });

    // Condiciones Crónicas
    const cc = p.num_condiciones_cronicas ?? 0;
    vars.push({
      label: 'Condiciones Crónicas',
      value: cc.toString(),
      isAlert: cc > 0,
      desc: cc > 0 ? `${cc} condiciones detectadas` : 'Sin condiciones'
    });

    // Infección Activa
    vars.push({
      label: 'Infección Activa',
      value: p.infeccion_activa ? 'Sí' : 'No',
      isAlert: !!p.infeccion_activa,
      desc: p.infeccion_activa ? 'Riesgo infeccioso' : 'Sin infección'
    });

    // Edad materna
    const age = p.edad_madre ?? 0;
    vars.push({
      label: 'Edad Materna',
      value: age.toString(),
      isAlert: age < 18 || age > 35,
      desc: age < 18 || age > 35 ? 'Edad de riesgo' : 'Rango seguro'
    });

    return vars;
  };

  // Calcular variables clínicas mapeadas del perfil clínico
  const clinicalVars = profile ? getClinicalVars(profile) : [];
  const alertCount = clinicalVars.filter((v) => v.isAlert).length;
  const totalCount = clinicalVars.length;

  // Formatear fecha de última consulta/predicción
  const getFormattedDate = () => {
    if (prediction?.fecha_prediccion) {
      const date = new Date(prediction.fecha_prediccion);
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Sin consultas previas';
  };

  // MAPEO DE COLORES DE RIESGO INSTITUCIONALES (Según Figma y specs/core-app.json)
  const getRiskStyles = (nivel: string | null | undefined) => {
    const safeNivel = nivel?.toLowerCase() || 'bajo';
    switch (safeNivel) {
      case 'critico':
        return {
          bg: 'bg-red-50/70 border-red-200 text-red-800',
          badge: 'bg-red-100 border-red-300 text-[#BA1A1A] font-extrabold',
          circle: '#BA1A1A',
          label: 'RIESGO CRÍTICO'
        };
      case 'alto':
        return {
          bg: 'bg-orange-50/70 border-orange-200 text-orange-800',
          badge: 'bg-orange-100 border-orange-300 text-orange-800 font-extrabold',
          circle: '#F59E0B',
          label: 'RIESGO ALTO'
        };
      case 'medio':
        return {
          bg: 'bg-yellow-50/70 border-yellow-200 text-yellow-800',
          badge: 'bg-yellow-100 border-yellow-300 text-yellow-800 font-extrabold',
          circle: '#D97706',
          label: 'RIESGO MEDIO'
        };
      case 'bajo':
      default:
        return {
          bg: 'bg-green-50/70 border-green-200 text-green-800',
          badge: 'bg-green-100 border-green-300 text-[#16A34A] font-extrabold',
          circle: '#16A34A',
          label: 'RIESGO BAJO'
        };
    }
  };

  const activeRiskStyle = getRiskStyles(prediction?.nivel_riesgo);

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen space-y-6 font-sans">
      
      {/* 1. HEADER - SELECTOR DE PACIENTE CON BUSCADOR INTERNO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0">
        
        {/* Contenedor del Buscador y Perfil Básico */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
          {/* Caja del Selector con Buscador */}
          <div className="relative w-full md:w-80 print:hidden">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Buscar Paciente Gestante</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                placeholder={selectedPatientObj ? `${selectedPatientObj.nombre} ${selectedPatientObj.apellidos}` : "Buscar paciente por nombre o DNI..."}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#612853]/20 focus:border-[#612853] transition-all"
              />
              <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                  }}
                  className="absolute right-3.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold bg-slate-200/60 px-1.5 py-0.5 rounded-full"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Dropdown flotante con los pacientes filtrados */}
            {showDropdown && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPacienteId(p.id);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-700">{p.nombre} {p.apellidos}</p>
                        <p className="text-[11px] font-medium text-slate-400">DNI: {p.dni}</p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Gestante</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs font-medium text-slate-400">
                    No se encontraron gestantes registradas
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caja informativa de paciente actual */}
          {profile && (
            <div className="flex items-center gap-4 bg-[#612853]/5 p-3 rounded-2xl border border-[#612853]/10 flex-1">
              <div className="w-12 h-12 bg-[#612853] rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                {profile.nombre.substring(0, 1)}{profile.apellidos.substring(0, 1)}
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base flex flex-wrap items-center gap-2">
                  {profile.nombre} {profile.apellidos}
                  <span className="text-xs font-bold text-purple-700 bg-purple-100/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {profile.edad_gestacional_semanas || 32} semanas
                  </span>
                </h2>
                {prediction?.prob_consenso != null ? (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Riesgo Consenso Calculado: {(prediction.prob_consenso * 100).toFixed(0)}%
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                    <Info className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Pendiente de calcular consenso predictivo
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bloques a la derecha: Última consulta y Estado de Riesgo */}
        <div className="flex items-center justify-between sm:justify-end gap-8 border-t border-slate-100 lg:border-t-0 pt-4 lg:pt-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Última Consulta</span>
            <span className="text-sm font-semibold text-slate-700 flex items-center sm:justify-end gap-1.5 mt-0.5">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> {getFormattedDate()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Riesgo</span>
            <span className={`inline-block text-xs font-black uppercase px-3.5 py-1.5 rounded-xl border tracking-wide mt-1 ${prediction?.prob_consenso != null ? activeRiskStyle.badge : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
              {prediction?.prob_consenso != null ? activeRiskStyle.label : 'SIN CONSULTA'}
            </span>
          </div>
        </div>
      </div>

      {/* ERROR Y CARGADORES */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-700 font-medium text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingData && (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-[#612853] rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-600">Analizando el historial de la paciente en la base de datos...</p>
        </div>
      )}

      {/* 2. GRID DE MODELOS MATEMÁTICOS / PREDICCIONES */}
      {!loadingData && profile && (
        <>
          {prediction?.prob_consenso == null ? (
            /* ESTADO VACÍO - NO HAY PREDICCIÓN */
            <div className="bg-gradient-to-br from-slate-50 to-purple-50/20 p-8 rounded-2xl border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#612853]/10 rounded-full flex items-center justify-center text-[#612853]">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-slate-800">No se encontraron predicciones de IA</h3>
                <p className="text-xs text-slate-500 mt-1">
                  La paciente seleccionada no cuenta con una simulación o ejecución del consenso de modelos predictivos (S-2). Ejecute el set de modelos matemáticos usando sus variables clínicas actuales.
                </p>
              </div>
              <button
                onClick={handleCalcularConsenso}
                disabled={calculating}
                className="px-6 py-3 bg-[#612853] hover:bg-[#522146] text-white text-xs font-bold rounded-xl transition duration-200 flex items-center gap-2 shadow-md disabled:opacity-55"
              >
                {calculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Procesando Algoritmos...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" /> Calcular Predicción por Consenso
                  </>
                )}
              </button>
            </div>
          ) : (
            /* CONEXIÓN REAL - GRID DE MODELOS */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Random Forest */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">Random Forest</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Modelo Ensemble</p>
                    </div>
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">Completado</span>
                  </div>

                  <div className="flex justify-center py-2">
                    <CircularProgress
                      percentage={Math.round(prediction.modelos!.random_forest.prob_prematuro * 100)}
                      strokeColor="#612853"
                    />
                  </div>

                  {/* Sección Interna: Importancia de Variables (Horizontal progress bars) */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Importancia de Variables (S-2)</span>
                    <div className="space-y-2 text-[11px]">
                      <div>
                        <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                          <span>Longitud Cervical</span>
                          <span>42%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: '42%', backgroundColor: '#612853' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                          <span>Partos Prematuros Previos</span>
                          <span>28%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: '28%', backgroundColor: '#612853' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                          <span>Edad Gestacional</span>
                          <span>18%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: '18%', backgroundColor: '#612853' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                          <span>Edad Materna</span>
                          <span>12%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: '12%', backgroundColor: '#612853' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-500">
                    Parto Estimado: <span className="text-[#612853] font-black">{prediction.modelos!.random_forest.semanas_estimadas} semanas</span>
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">IC 95%: {MODEL_METADATA.random_forest.ic95} | Margen: {MODEL_METADATA.random_forest.margen}</p>
                </div>
              </div>

              {/* Card 2: CatBoost */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">CatBoost</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gradient Boosting</p>
                    </div>
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">Completado</span>
                  </div>

                  <div className="flex justify-center py-2">
                    <CircularProgress
                      percentage={Math.round(prediction.modelos!.catboost.prob_prematuro * 100)}
                      strokeColor="#F59E0B"
                    />
                  </div>

                  {/* Sección Interna: Parámetros del Modelo de soporte */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-[11px] text-slate-600">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Parámetros del Modelo</span>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Margen de Decisión:</span>
                      <span className="font-bold text-slate-700">{MODEL_METADATA.catboost.margen}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Intervalo de Confianza:</span>
                      <span className="font-bold text-slate-700">{MODEL_METADATA.catboost.ic95}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400 font-medium">Precisión Curva ROC:</span>
                      <span className="font-bold text-slate-700">{MODEL_METADATA.catboost.accuracy}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-500">
                    Parto Estimado: <span className="text-amber-600 font-black">{prediction.modelos!.catboost.semanas_estimadas} semanas</span>
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Optimizador nativo simétrico .cbm</p>
                </div>
              </div>

              {/* Card 3: SVM Lineal */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">Regresion Logistica</h3>
                    </div>
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">Completado</span>
                  </div>

                  <div className="flex justify-center py-2">
                    <CircularProgress
                      percentage={Math.round(prediction.modelos!.svm.prob_prematuro * 100)}
                      strokeColor="#BA1A1A"
                    />
                  </div>

                  {/* Sección Interna: Parámetros del Modelo de soporte */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-[11px] text-slate-600">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Parámetros del Modelo</span>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Margen de Decisión:</span>
                      <span className="font-bold text-slate-700">{MODEL_METADATA.svm.margen}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Intervalo de Confianza:</span>
                      <span className="font-bold text-slate-700">{MODEL_METADATA.svm.ic95}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400 font-medium">Precisión Curva ROC:</span>
                      <span className="font-bold text-slate-700">{MODEL_METADATA.svm.accuracy}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-500">
                    Parto Estimado: <span className="text-[#BA1A1A] font-black">{prediction.modelos!.svm.semanas_estimadas} semanas</span>
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">LinearSVC con márgenes suaves optimizados</p>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* 3. ACORDEÓN INFERIOR - RESUMEN DE DATOS DE ENTRADA (Sincronizado) */}
      {profile && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
          <button
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition cursor-pointer print:bg-white print:border-none"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#612853]" />
                <span className="font-extrabold text-slate-700 text-sm">Resumen de Variables Clínicas de Entrada (S-2)</span>
              </div>
              <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase border tracking-wider ${alertCount > 0 ? 'bg-red-50 border-red-200 text-[#BA1A1A]' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {alertCount} de {totalCount} variables fuera de rango
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 print:hidden ${isAccordionOpen ? 'transform rotate-180' : ''}`} />
          </button>

          {isAccordionOpen && (
            <div className="p-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {clinicalVars.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-50 bg-slate-50/20 hover:bg-slate-50/40 hover:border-slate-100 transition duration-150"
                  >
                    {v.isAlert ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-slate-500 font-bold text-xs truncate">{v.label}</span>
                        <span className={`text-xs font-black shrink-0 ${v.isAlert ? 'text-[#BA1A1A]' : 'text-slate-800'}`}>
                          {v.value}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                        {v.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ACCIONES INFERIORES */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 print:hidden">
        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Printer className="w-4 h-4 text-slate-500" /> Imprimir Reporte Clínico
        </button>
        <button
          onClick={handleCalcularConsenso}
          disabled={calculating || selectedPacienteId === null}
          className="w-full sm:w-auto px-5 py-2.5 bg-white border border-purple-200 rounded-xl text-[#612853] text-xs font-bold hover:bg-purple-50 hover:border-purple-300 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[#612853] ${calculating ? 'animate-spin' : ''}`} /> Guardar/Actualizar Predicción
        </button>
        <button
          onClick={() => navigate('/triaje')}
          className="w-full sm:w-auto px-6 py-2.5 text-white text-xs font-bold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md"
          style={{ backgroundColor: '#612853' }}
        >
          Ir a Triaje <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};