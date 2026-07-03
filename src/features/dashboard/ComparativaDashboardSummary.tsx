import { Link } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import ComparativaAnalyticsPanel from '../feedback/ComparativaAnalyticsPanel';

export default function ComparativaDashboardSummary() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <GitCompare className="w-4 h-4 text-sky-700" />
        <h3 className="text-sm font-bold text-gray-800">Comparativa: modelo vs médico vs real</h3>
      </div>
      <ComparativaAnalyticsPanel compact />
      <Link to="/feedback?tab=comparativa" className="inline-block text-xs font-bold text-sky-800 underline">
        Ver análisis completo en Rendimiento de Modelos →
      </Link>
    </div>
  );
}
