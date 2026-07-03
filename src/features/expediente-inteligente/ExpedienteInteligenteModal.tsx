import { useState, useEffect, useRef } from 'react';
import type { ExpedienteTab, ExpedienteInteligenteProps } from './types';
import { Search, X, Loader2 } from 'lucide-react';
import PredictionTab from './components/PredictionTab';
import TriageTab from './components/TriageTab';
import RecommendationTab from './components/RecommendationTab';
import { getPacientesFiltered } from '../../services/api';
import type { PacienteResponse } from '../../services/api';
import { useModalBackdrop } from '../../hooks/useModalBackdrop';

const TABS: { key: ExpedienteTab; label: string; icon: string }[] = [
  { key: 'prediccion', label: 'Predicción de Riesgo', icon: '📊' },
  { key: 'triaje', label: 'Triaje Clínico', icon: '🏥' },
  { key: 'recomendaciones', label: 'Recomendaciones', icon: '💊' },
];

export default function ExpedienteInteligenteModal({
  pacienteId: initialPacienteId,
  onClose,
}: ExpedienteInteligenteProps) {
  const [activeTab, setActiveTab] = useState<ExpedienteTab>('prediccion');
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(initialPacienteId ?? null);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResponse | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Patient search
  const [patients, setPatients] = useState<PacienteResponse[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setLoadingPatients(true);
    setPatientError(null);
    getPacientesFiltered({ estado: 'activo', limit: 100 })
      .then(res => {
        setPatients(res.items || []);
        if (!res.items || res.items.length === 0) {
          setPatientError('No hay pacientes registrados en el sistema.');
        }
      })
      .catch(err => {
        const detail = err?.response?.data?.detail;
        const msg = Array.isArray(detail)
          ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          : detail || err?.message || 'Error de conexión con el backend.';
        setPatientError(String(msg));
        console.error('Error cargando pacientes:', err);
      })
      .finally(() => setLoadingPatients(false));
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (selectedPacienteId) {
      const match = patients.find(p => p.id === selectedPacienteId);
      setSelectedPaciente(match ?? null);
    }
  }, [selectedPacienteId, patients]);

  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase();
    return `${p.nombre} ${p.apellidos}`.toLowerCase().includes(q) || p.dni.includes(q);
  });

  const handleSelect = (p: PacienteResponse) => {
    setSelectedPacienteId(p.id);
    setSelectedPaciente(p);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const backdrop = useModalBackdrop(onClose);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs"
      {...backdrop}
    >
      <div
        className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-gray-100 flex flex-col animate-zoom-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#612853' }}>
          <div className="text-white">
            <h3 className="font-extrabold text-lg">Expediente Inteligente</h3>
            <p className="text-xs text-fuchsia-200">Predicción · Triaje · Recomendaciones</p>
          </div>
          <button onClick={onClose} className="text-fuchsia-200 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient selector */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          {selectedPaciente ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#612853' }}>
                  {selectedPaciente.nombre.charAt(0)}{selectedPaciente.apellidos.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedPaciente.nombre} {selectedPaciente.apellidos}</p>
                  <p className="text-xs text-gray-500">DNI {selectedPaciente.dni}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedPacienteId(null); setSelectedPaciente(null); }}
                className="text-xs text-gray-400 hover:text-gray-600 font-semibold underline"
              >
                Cambiar paciente
              </button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                placeholder="Buscar paciente por nombre o DNI..."
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-300 bg-white"
              />
              {showDropdown && (
                <div className="absolute z-[70] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {loadingPatients ? (
                    <div className="p-4 text-center text-xs font-medium text-gray-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando pacientes...
                    </div>
                  ) : patientError ? (
                    <div className="p-4 text-center text-xs font-medium text-red-500">
                      {patientError}
                    </div>
                  ) : filteredPatients.length > 0 ? (
                    filteredPatients.map(p => (
                      <button key={p.id} type="button" onClick={() => handleSelect(p)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-700">{p.nombre} {p.apellidos}</p>
                          <p className="text-[11px] font-medium text-gray-400">DNI: {p.dni}</p>
                        </div>
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Gestante</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs font-medium text-gray-400">
                      {searchQuery ? 'No se encontraron pacientes con ese criterio.' : 'No hay pacientes registrados.'}
                    </div>
                  )}
                </div>
              )}
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold bg-gray-200/60 px-1.5 py-0.5 rounded-full"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors relative ${
                activeTab === tab.key
                  ? 'text-fuchsia-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: '#612853' }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {!selectedPacienteId ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Seleccione un paciente para ver la información de {activeTab === 'prediccion' ? 'predicción de riesgo' : activeTab === 'triaje' ? 'triaje clínico' : 'recomendaciones clínicas'}.
            </div>
          ) : activeTab === 'prediccion' ? (
            <PredictionTab pacienteId={selectedPacienteId} />
          ) : activeTab === 'triaje' ? (
            <TriageTab pacienteId={selectedPacienteId} />
          ) : (
            <RecommendationTab pacienteId={selectedPacienteId} />
          )}
        </div>
      </div>
    </div>
  );
}
