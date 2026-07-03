import HorarioMedicoEditor from '../../../components/agenda/HorarioMedicoEditor';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';

interface HorarioMedicoModalProps {
  medicoId: number;
  medicoNombre: string;
  onClose: () => void;
}
export default function HorarioMedicoModal({ medicoId, medicoNombre, onClose }: HorarioMedicoModalProps) {
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-extrabold text-lg text-gray-900">Horario de atención</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6">
          <HorarioMedicoEditor medicoId={medicoId} medicoNombre={medicoNombre} />
          <button type="button" onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
