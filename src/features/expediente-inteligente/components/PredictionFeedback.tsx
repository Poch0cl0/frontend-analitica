import ModelFeedback from './ModelFeedback';

interface PredictionFeedbackProps {
  prediccionId: number;
}

export default function PredictionFeedback({ prediccionId }: PredictionFeedbackProps) {
  return (
    <div className="bg-white rounded-xl border border-fuchsia-100 shadow-sm p-4 space-y-3">
      <div>
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Calificación del consenso</span>
        <p className="text-xs text-gray-500 mt-1">
          Califique por separado la probabilidad y las semanas del resultado de consenso (además de cada modelo arriba).
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
