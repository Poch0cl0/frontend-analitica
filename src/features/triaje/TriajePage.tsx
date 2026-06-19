import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTriajePriorizados, sincronizarTriaje, exportarReportePaciente, enviarReportePaciente } from '../../services/api';
import type { TriajePriorizadoItem, TriajeAlgoritmo } from '../../services/api';
import PacienteClinicoModal from './PacienteClinicoModal';
import { loadAtenderFormForPaciente } from '../../utils/atenderFormLoader';
import type { DcAtenderForm } from '../../components/DatosClinicosAtenderForm';

const PRIMARY = '#612853';

type NivelUrgencia = 'rojo' | 'naranja' | 'amarillo' | 'verde';
type FiltroNivel = NivelUrgencia | 'todos';

const NIVELES: { key: NivelUrgencia; label: string; sub: string; color: string; bg: string; border: string }[] = [
  { key: 'rojo', label: 'ROJO — CRÍTICO', sub: 'Requiere Atención Inmediata', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  { key: 'naranja', label: 'NARANJA — ALTO', sub: 'Seguimiento Urgente', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  { key: 'amarillo', label: 'AMARILLO — MODERADO', sub: 'Monitoreo Estrecho', color: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A' },
  { key: 'verde', label: 'VERDE — BAJO', sub: 'Control Rutinario', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
];

const ALGORITMOS: { key: TriajeAlgoritmo; label: string }[] = [
  { key: 'ordinal', label: 'Regresión Logística Ordinal' },
  { key: 'arbol', label: 'Árbol de Decisión' },
  { key: 'consenso', label: 'Puntaje Ponderado' },
];

function getNivelConfig(nivel: string) {
  const n = nivel?.toLowerCase();
  return NIVELES.find(l => l.key === n) || NIVELES[3];
}

function getScore(p: TriajePriorizadoItem): number {
  if (p.score_formula_ponderada != null) {
    return Math.round(Number(p.score_formula_ponderada) * 100);
  }
  if (p.prob_consenso != null) {
    return Math.round(Number(p.prob_consenso) * 100);
  }
  return 0;
}

function buildTags(p: TriajePriorizadoItem): string[] {
  const tags: string[] = [];
  if (p.edad_gestacional_semanas) tags.push(`${p.edad_gestacional_semanas} semanas de gestación`);
  if (p.bmi != null) tags.push(`IMC ${Number(p.bmi).toFixed(1)}`);
  if (p.num_condiciones_cronicas && p.num_condiciones_cronicas > 0) {
    tags.push(`${p.num_condiciones_cronicas} condición(es) crónica(s)`);
  }
  if (p.prob_consenso != null) {
    tags.push(`Riesgo prematuro ${Math.round(Number(p.prob_consenso) * 100)}%`);
  }
  return tags;
}

export default function TriajePage() {
  const navigate = useNavigate();
  const [algoritmo, setAlgoritmo] = useState<TriajeAlgoritmo>('arbol');
  const [nivelActivo, setNivelActivo] = useState<FiltroNivel>('todos');
  const [todos, setTodos] = useState<TriajePriorizadoItem[]>([]);
  const [filtrados, setFiltrados] = useState<TriajePriorizadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [reportLoadingId, setReportLoadingId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [clinicoModal, setClinicoModal] = useState<{
    nombre: string;
    dni: string;
    form: DcAtenderForm | null;
    loading: boolean;
  } | null>(null);

  // CORRECCIÓN: try-catch añadido para evitar congelamiento de UI en errores de API
  const handleVerClinicos = async (p: TriajePriorizadoItem) => {
    setClinicoModal({ nombre: `${p.nombre} ${p.apellidos}`, dni: p.dni, form: null, loading: true });
    try {
      const loaded = await loadAtenderFormForPaciente(p.paciente_id);
      setClinicoModal({
        nombre: `${p.nombre} ${p.apellidos}`,
        dni: p.dni,
        form: loaded.form,
        loading: false,
      });
    } catch (err) {
      console.error("Error al cargar datos clínicos", err);
      setClinicoModal(null);
      alert("No se pudieron cargar los datos clínicos de la paciente.");
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

  const handleDownloadReport = async (pacienteId: number, dni: string) => {
    setReportLoadingId(pacienteId);
    setReportMsg(null);
    try {
      const blob = await exportarReportePaciente(pacienteId, 'pdf', 'triaje');
      downloadBlob(blob, `triaje_${dni}.pdf`);
    } catch {
      setReportMsg('No se pudo generar el reporte PDF.');
    } finally {
      setReportLoadingId(null);
    }
  };

  const handleSendReport = async (pacienteId: number) => {
    setReportLoadingId(pacienteId);
    setReportMsg(null);
    try {
      const res = await enviarReportePaciente(pacienteId, 'triaje');
      setReportMsg(res.mensaje);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setReportMsg(typeof detail === 'string' ? detail : 'Error al enviar el reporte.');
    } finally {
      setReportLoadingId(null);
    }
  };

  const conteos = useMemo((): Record<NivelUrgencia, number> => {
    return {
      rojo: todos.filter(p => p.nivel_urgencia?.toLowerCase() === 'rojo').length,
      naranja: todos.filter(p => p.nivel_urgencia?.toLowerCase() === 'naranja').length,
      amarillo: todos.filter(p => p.nivel_urgencia?.toLowerCase() === 'amarillo').length,
      verde: todos.filter(p => p.nivel_urgencia?.toLowerCase() === 'verde').length,
    };
  }, [todos]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSyncMsg(null);
    try {
      const data = await getTriajePriorizados(undefined, algoritmo);
      setTodos(data);
      setLastUpdate(new Date());
    } catch {
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [algoritmo]);

  const handleActualizar = useCallback(async () => {
    setIsLoading(true);
    setSyncMsg(null);
    try {
      const { procesados } = await sincronizarTriaje();
      const data = await getTriajePriorizados(undefined, algoritmo);
      setTodos(data);
      setLastUpdate(new Date());
      if (procesados > 0) {
        setSyncMsg(`Se enviaron ${procesados} paciente(s) a triaje.`);
      }
    } catch {
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [algoritmo]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setFiltrados(
      nivelActivo === 'todos'
        ? todos
        : todos.filter(p => p.nivel_urgencia?.toLowerCase() === nivelActivo),
    );
  }, [todos, nivelActivo]);

  const nivelCfg = nivelActivo === 'todos'
    ? { key: 'todos' as const, label: 'TODOS LOS NIVELES', sub: 'Todos los pacientes con triaje', color: PRIMARY, bg: '#FDF8FA', border: '#E5E7EB' }
    : getNivelConfig(nivelActivo);
  const minsAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);

  return (
    <div className="flex-1 flex flex-col p-6 bg-[#FDF8FA] min-h-screen space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Módulos Clínicos</p>
          <h1 className="text-2xl font-extrabold text-gray-900">Sistema de Priorización por Urgencia</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pacientes con predicción de riesgo registrada · última actualización: hace {minsAgo < 1 ? 'un momento' : `${minsAgo} min`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir reporte
          </button>
        <button onClick={handleActualizar} disabled={isLoading}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm self-start"
          style={{ backgroundColor: PRIMARY }}>
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar Triaje
        </button>
        </div>
      </div>

      {reportMsg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold print:hidden ${
          reportMsg.includes('enviado') || reportMsg.includes('Enviado')
            ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
            : 'text-amber-800 bg-amber-50 border border-amber-200'
        }`}>
          {reportMsg}
        </div>
      )}

      {syncMsg && (
        <div className="rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
          {syncMsg}
        </div>
      )}

      {/* SELECTOR DE ALGORITMO */}
      <div className="flex flex-wrap gap-2">
        {ALGORITMOS.map(a => (
          <button key={a.key} onClick={() => setAlgoritmo(a.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
              algoritmo === a.key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={algoritmo === a.key ? { backgroundColor: PRIMARY } : {}}>
            {a.label}
          </button>
        ))}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button onClick={() => setNivelActivo('todos')}
          className={`text-left rounded-2xl p-4 border-2 transition-all ${
            nivelActivo === 'todos' ? 'shadow-md scale-[1.02]' : 'shadow-sm hover:shadow-md'
          }`}
          style={{
            backgroundColor: '#F9FAFB',
            borderColor: nivelActivo === 'todos' ? PRIMARY : '#E5E7EB',
          }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIMARY }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">todos</span>
          </div>
          <p className="text-xs font-semibold text-gray-700">Todos los niveles</p>
          <p className="text-3xl font-extrabold mt-1 text-gray-900">{todos.length}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">pacientes</p>
        </button>
        {NIVELES.map(n => (
          <button key={n.key} onClick={() => setNivelActivo(n.key)}
            className={`text-left rounded-2xl p-4 border-2 transition-all ${
              nivelActivo === n.key ? 'shadow-md scale-[1.02]' : 'shadow-sm hover:shadow-md'
            }`}
            style={{
              backgroundColor: n.bg,
              borderColor: nivelActivo === n.key ? n.color : n.border,
            }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: n.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: n.color }}>{n.key}</span>
            </div>
            <p className="text-xs font-semibold text-gray-700">{n.label.split('—')[1]?.trim()}</p>
            <p className="text-3xl font-extrabold mt-1" style={{ color: n.color }}>{conteos[n.key]}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">pacientes</p>
          </button>
        ))}
      </div>

      {/* BANNER NIVEL ACTIVO */}
      <div className="rounded-xl px-5 py-3 flex items-center justify-between"
        style={{ backgroundColor: nivelCfg.color }}>
        <div>
          <p className="text-white font-extrabold text-sm uppercase tracking-wide">
            NIVEL {nivelCfg.label}
          </p>
          <p className="text-white/80 text-xs font-medium">{nivelCfg.sub}</p>
        </div>
        <span className="text-white font-extrabold text-sm bg-white/20 px-3 py-1 rounded-lg">
          {filtrados.length} PACIENTE{filtrados.length !== 1 ? 'S' : ''} ESPERANDO
        </span>
      </div>

      {/* LISTA DE PACIENTES */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-4 animate-spin" style={{ borderTopColor: PRIMARY }} />
          <p className="text-sm text-gray-400">Cargando pacientes priorizados...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500 font-medium">
            {nivelActivo === 'todos'
              ? 'No hay pacientes en triaje todavía.'
              : `No hay pacientes en nivel ${nivelCfg.label} con este algoritmo.`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Los pacientes con predicción aparecen automáticamente. Use &quot;Actualizar Triaje&quot; para enviar a triaje a todos los elegibles.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtrados.map(p => {
            const score = getScore(p);
            const tags = buildTags(p);
            const cfg = getNivelConfig(p.nivel_urgencia);
            const acciones = p.acciones_urgentes || [];

            return (
              <div key={p.paciente_id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">

                {/* Score lateral */}
                <div className="md:w-36 flex-shrink-0 flex flex-col items-center justify-center p-5 border-b md:border-b-0 md:border-r border-gray-100"
                  style={{ backgroundColor: cfg.bg }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>
                    {p.nivel_urgencia?.toUpperCase()}
                  </span>
                  <span className="text-4xl font-black" style={{ color: cfg.color }}>{score}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">SCORE</span>
                </div>

                {/* Info central */}
                <div className="flex-1 p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900">
                        {p.nombre} {p.apellidos}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        DNI {p.dni}
                        {p.edad_gestacional_semanas ? ` · ${p.edad_gestacional_semanas} semanas de gestación` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
                        {p.nivel_urgencia?.toUpperCase()} PRIORIDAD
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">ID: #{p.paciente_id}</span>
                    </div>
                  </div>

                  {/* Tags médicos */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recomendaciones */}
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

                {/* Acciones */}
                <div className="flex md:flex-col items-center justify-center gap-2 p-4 border-t md:border-t-0 md:border-l border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/recomendaciones/${p.paciente_id}`)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm"
                    style={{ backgroundColor: cfg.color }}
                  >
                    Ver recomendaciones
                  </button>
                  <button
                    onClick={() => handleVerClinicos(p)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handleDownloadReport(p.paciente_id, p.dni)}
                    disabled={reportLoadingId === p.paciente_id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 print:hidden"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleSendReport(p.paciente_id)}
                    disabled={reportLoadingId === p.paciente_id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 print:hidden"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {clinicoModal && (
        <PacienteClinicoModal
          pacienteNombre={clinicoModal.nombre}
          pacienteDni={clinicoModal.dni}
          form={clinicoModal.form}
          isLoading={clinicoModal.loading}
          onClose={() => setClinicoModal(null)}
        />
      )}
    </div>
  );
}