import type { ExpedienteInteligenteProps } from './types';
import ExpedienteInteligentePanel from './ExpedienteInteligentePanel';
import { useModalBackdrop } from '../../hooks/useModalBackdrop';

export default function ExpedienteInteligenteModal({
  pacienteId: initialPacienteId,
  onClose,
}: ExpedienteInteligenteProps) {
  const backdrop = useModalBackdrop(onClose);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs"
      {...backdrop}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl">
        <ExpedienteInteligentePanel pacienteId={initialPacienteId} onClose={onClose} />
      </div>
    </div>
  );
}
