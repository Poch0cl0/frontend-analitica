import { useModalBackdrop } from '../../../hooks/useModalBackdrop';

interface DeleteCitaModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteCitaModal({ onClose, onConfirm }: DeleteCitaModalProps) {
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-extrabold text-lg text-gray-950">¿Cancelar esta cita?</h3>
        <p className="text-sm text-gray-500">Esta acción marcará la cita como cancelada de forma definitiva.</p>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
            Volver
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
