export type ExpedienteTab = 'prediccion' | 'triaje' | 'recomendaciones';

export interface ExpedienteInteligenteProps {
  pacienteId?: number | null;
  onClose: () => void;
}
