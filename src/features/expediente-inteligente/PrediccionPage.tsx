import { useSearchParams } from 'react-router-dom';
import ExpedienteInteligentePanel from './ExpedienteInteligentePanel';

export default function PrediccionPage() {
  const [searchParams] = useSearchParams();
  const pacienteParam = searchParams.get('paciente');
  const pacienteId = pacienteParam ? Number(pacienteParam) : null;
  const initialId = pacienteId != null && !Number.isNaN(pacienteId) ? pacienteId : null;

  return (
    <div className="flex-1 p-4 md:p-6 bg-slate-50/50">
      <ExpedienteInteligentePanel pacienteId={initialId} embedded />
    </div>
  );
}
