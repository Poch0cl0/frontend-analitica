import type { DcAtenderForm } from '../../components/DatosClinicosAtenderForm';
import { DcAtenderReadonlyView } from '../../components/DatosClinicosAtenderForm';
import { useModalBackdrop } from '../../hooks/useModalBackdrop';

interface PacienteClinicoModalProps {
  pacienteNombre: string;
  pacienteDni: string;
  form: DcAtenderForm | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function PacienteClinicoModal({
  pacienteNombre,
  pacienteDni,
  form,
  isLoading,
  onClose,
}: PacienteClinicoModalProps) {
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#612853' }}>
          <div className="text-white">
            <h3 className="font-extrabold text-lg">Datos Clínicos del Paciente</h3>
            <p className="text-xs text-fuchsia-200">{pacienteNombre} · DNI {pacienteDni}</p>
          </div>
          <button onClick={onClose} className="text-fuchsia-200 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-8 animate-spin mx-auto" style={{ borderTopColor: '#612853' }} />
              <p className="text-sm text-gray-500 mt-3">Cargando datos clínicos...</p>
            </div>
          ) : form ? (
            <DcAtenderReadonlyView form={form} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No hay datos clínicos registrados para esta paciente.</p>
          )}

          <div className="pt-5 mt-2 border-t border-gray-100 flex justify-end">
            <button type="button" onClick={onClose} className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
