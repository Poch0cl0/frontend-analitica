import type { FeedbackModeloFiltro } from '../../services/api';

export function modeloFeedbackLabel(modelo: string | null | undefined): string {
  if (!modelo) return 'Consenso';
  const map: Record<string, string> = {
    random_forest: 'Random Forest',
    catboost: 'CatBoost',
    svm: 'SVM',
  };
  return map[modelo] ?? modelo;
}

export function aspectoFeedbackLabel(aspecto: string): string {
  return aspecto === 'semanas' ? 'Semanas estimadas' : 'Probabilidad';
}

export const FEEDBACK_MODELO_OPTIONS: { value: '' | FeedbackModeloFiltro; label: string }[] = [
  { value: '', label: 'Todos los modelos' },
  { value: 'random_forest', label: 'Random Forest' },
  { value: 'catboost', label: 'CatBoost' },
  { value: 'svm', label: 'SVM' },
  { value: 'consenso', label: 'Consenso' },
];

export const FEEDBACK_ASPECTO_OPTIONS: { value: '' | 'probabilidad' | 'semanas'; label: string }[] = [
  { value: '', label: 'Probabilidad y semanas' },
  { value: 'probabilidad', label: 'Solo probabilidad' },
  { value: 'semanas', label: 'Solo semanas' },
];
