import type { FormEvent } from 'react';
import type { CitaResponseEnriquecida } from '../../services/api';
import { DcAtenderFormView, type DcAtenderForm } from '../../components/DatosClinicosAtenderForm';
import { formatHour } from './citaUiUtils';

interface AtenderCitaModalProps {
  cita: CitaResponseEnriquecida;
  form: DcAtenderForm;
  hasExistingData: boolean;
  isSaving: boolean;
  onClose: () => void;
  onChange: (form: DcAtenderForm) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function AtenderCitaModal({
  cita,
  form,
  hasExistingData,
  isSaving,
  onClose,
  onChange,
  onSubmit,
}: AtenderCitaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
         onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
              <svg className="w-5 h-5" style={{ color: '#612853' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Atender Cita</h2>
              <p className="text-xs text-gray-500">
                {cita.paciente_nombre} · {formatHour(cita.fecha_hora)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mx-6 mt-5 space-y-2">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              Registra los datos clínicos permitidos para esta consulta. Al guardar, la cita quedará marcada como <strong>Atendida</strong>.
            </p>
          </div>
          {hasExistingData && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Esta paciente ya tiene datos clínicos. Los valores que guardes <strong>reemplazarán</strong> los anteriores.
              </p>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={onSubmit}>
            <DcAtenderFormView form={form} onChange={onChange} />
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50"
                style={{ borderColor: '#E8D5EF' }}>
                Cancelar
              </button>
              <button type="submit" disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: '#612853' }}>
                {isSaving ? 'Guardando...' : hasExistingData ? 'Actualizar datos y marcar como Atendida' : 'Guardar datos y marcar como Atendida'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
