import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, GitCompare } from 'lucide-react';
import VotacionAnalyticsPanel from './VotacionAnalyticsPanel';
import ComparativaAnalyticsPanel from './ComparativaAnalyticsPanel';

type FeedbackTab = 'votacion' | 'comparativa';

const TABS: { id: FeedbackTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'votacion', label: 'Votación médica', icon: BarChart3 },
  { id: 'comparativa', label: 'Comparativa modelo / médico / real', icon: GitCompare },
];

export default function FeedbackAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: FeedbackTab = tabParam === 'comparativa' ? 'comparativa' : 'votacion';
  const [tab, setTab] = useState<FeedbackTab>(initialTab);

  useEffect(() => {
    if (tabParam === 'comparativa' || tabParam === 'votacion') {
      setTab(tabParam);
    }
  }, [tabParam]);

  const selectTab = (next: FeedbackTab) => {
    setTab(next);
    setSearchParams(next === 'votacion' ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-0 border-b border-gray-100 bg-white/80">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Rendimiento de modelos</h1>
        <p className="text-xs text-gray-500 mb-4">
          Votación de acuerdo/desacuerdo y comparativa numérica entre IA, dictamen médico y resultado real.
        </p>
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border border-b-0 transition-colors ${
                  active
                    ? 'bg-white border-gray-200 text-fuchsia-900 -mb-px z-10'
                    : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
        {tab === 'votacion' ? <VotacionAnalyticsPanel /> : <ComparativaAnalyticsPanel />}
      </div>
    </div>
  );
}
