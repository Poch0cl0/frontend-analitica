import ModelFeedback from './ModelFeedback';

interface PredictionFeedbackProps {
  prediccionId: number;
  pacienteNombre: string;
}

export default function PredictionFeedback({ prediccionId, pacienteNombre }: PredictionFeedbackProps) {
  return (
    <div className="bg-white rounded-xl border border-fuchsia-100 shadow-sm p-4 space-y-3">
      <div>
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Calificación del consenso</span>
        <p className="text-xs text-gray-500 mt-1">
          Como médico de {pacienteNombre}, indique si está de acuerdo con cada aspecto de la predicción.
        </p>
      </div>
      <ModelFeedback
        prediccionId={prediccionId}
        aspecto="probabilidad"
        pregunta="¿La probabilidad de riesgo es acertada?"
      />
      <ModelFeedback
        prediccionId={prediccionId}
        aspecto="semanas"
        pregunta="¿Las semanas estimadas de parto son acertadas?"
      />
    </div>
  );
}
