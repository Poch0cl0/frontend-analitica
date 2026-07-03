import type { TriajeAlgoritmo, TriajePriorizadoItem } from '../../../services/api';

export type NivelUrgencia = 'rojo' | 'naranja' | 'amarillo' | 'verde';
export type FiltroNivel = NivelUrgencia | 'todos';

export const NIVELES = [
  { key: 'rojo' as const, label: 'ROJO — CRÍTICO', sub: 'Requiere Atención Inmediata', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  { key: 'naranja' as const, label: 'NARANJA — ALTO', sub: 'Seguimiento Urgente', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  { key: 'amarillo' as const, label: 'AMARILLO — MODERADO', sub: 'Monitoreo Estrecho', color: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A' },
  { key: 'verde' as const, label: 'VERDE — BAJO', sub: 'Control Rutinario', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
];

export const ALGORITMOS: { key: TriajeAlgoritmo; label: string }[] = [
  { key: 'ordinal', label: 'Regresión Logística Ordinal' },
  { key: 'arbol', label: 'Árbol de Decisión' },
  { key: 'consenso', label: 'Puntaje Ponderado' },
];

export function getNivelConfig(nivel: string) {
  const n = nivel?.toLowerCase();
  return NIVELES.find((l) => l.key === n) || NIVELES[3];
}

export function getScore(p: TriajePriorizadoItem): number {
  if (p.score_formula_ponderada != null) return Math.round(Number(p.score_formula_ponderada) * 100);
  if (p.prob_consenso != null) return Math.round(Number(p.prob_consenso) * 100);
  return 0;
}

export function buildTags(p: TriajePriorizadoItem): string[] {
  const tags: string[] = [];
  if (p.edad_gestacional_semanas) tags.push(`${p.edad_gestacional_semanas} semanas de gestación`);
  if (p.bmi != null) tags.push(`IMC ${Number(p.bmi).toFixed(1)}`);
  if (p.num_condiciones_cronicas && p.num_condiciones_cronicas > 0) tags.push(`${p.num_condiciones_cronicas} condición(es) crónica(s)`);
  if (p.prob_consenso != null) tags.push(`Riesgo prematuro ${Math.round(Number(p.prob_consenso) * 100)}%`);
  return tags;
}
