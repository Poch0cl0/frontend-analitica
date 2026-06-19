import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTriajePriorizados } from '../../services/api';
import type { TriajePriorizadoItem, TriajeAlgoritmo } from '../../services/api';

const PRIMARY = '#612853';

type NivelUrgencia = 'rojo' | 'naranja' | 'amarillo' | 'verde';

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
  const n = nivel.toLowerCase();
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
  const [nivelActivo, setNivelActivo] = useState<NivelUrgencia>('rojo');
  const [todos, setTodos] = useState<TriajePriorizadoItem[]>([]);
  const [filtrados, setFiltrados] = useState<TriajePriorizadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const conteos: Record<NivelUrgencia, number> = {
    rojo: todos.filter(p => p.nivel_urgencia.toLowerCase() === 'rojo').length,
    naranja: todos.filter(p => p.nivel_urgencia.toLowerCase() === 'naranja').length,
    amarillo: todos.filter(p => p.nivel_urgencia.toLowerCase() === 'amarillo').length,
    verde: todos.filter(p => p.nivel_urgencia.toLowerCase() === 'verde').length,
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
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

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setFiltrados(todos.filter(p => p.nivel_urgencia.toLowerCase() === nivelActivo));
  }, [todos, nivelActivo]);

  const nivelCfg = getNivelConfig(nivelActivo);
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
        <button onClick={loadData} disabled={isLoading}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm self-start"
          style={{ backgroundColor: PRIMARY }}>
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar Triaje
        </button>
      </div>

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <p className="text-gray-500 font-medium">No hay pacientes en nivel {nivelCfg.label} con este algoritmo.</p>
          <p className="text-xs text-gray-400 mt-1">Solo aparecen pacientes que ya tienen predicción y triaje registrados.</p>
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
                    {p.nivel_urgencia.toUpperCase()}
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
                        {p.nivel_urgencia.toUpperCase()} PRIORIDAD
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
                  <button onClick={() => navigate(`/pacientes/${p.paciente_id}`, { state: { initialTab: 'citas' } })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm"
                    style={{ backgroundColor: cfg.color }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Atender
                  </button>
                  <button onClick={() => navigate(`/pacientes/${p.paciente_id}`)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
