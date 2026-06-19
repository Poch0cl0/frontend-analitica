import type { CitaResponseEnriquecida } from '../../services/api';
import type { PacientePerfilResponse } from './types';
import {
  formatFullDate,
  getRiskBadgeStyles,
  getStatusBadgeStyles,
  getStatusLabel,
} from './citaUiUtils';

interface CitaDetailModalProps {
  cita: CitaResponseEnriquecida | null;
  perfil: PacientePerfilResponse | null;
  isLoading: boolean;
  isDoctor: boolean;
  onClose: () => void;
  onIniciarConsulta: () => void;
  onAtender: () => void;
  onVerExpediente: () => void;
}

export default function CitaDetailModal({
  cita,
  perfil,
  isLoading,
  isDoctor,
  onClose,
  onIniciarConsulta,
  onAtender,
  onVerExpediente,
}: CitaDetailModalProps) {
  if (!cita) return null;

  const canAtender = cita.estado === 'programada' || cita.estado === 'en_atencion';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-zoom-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#612853' }}>
          <div className="text-white">
            <h3 className="font-extrabold text-lg">Detalle de la Cita Médica</h3>
            <p className="text-xs text-fuchsia-200">ID de Cita: #{cita.id}</p>
          </div>
          <button onClick={onClose} className="text-fuchsia-200 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-8 animate-spin" style={{ borderTopColor: '#612853' }} />
            <p className="text-gray-500 text-sm font-medium">Obteniendo expediente clínico del SAT...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-gray-700 bg-white border border-gray-200 shadow-xs">
                  {cita.paciente_nombre?.substring(0, 2).toUpperCase() || 'P'}
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-950 text-base">{cita.paciente_nombre}</h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Paciente #{cita.paciente_id} | Edad Gestacional:{' '}
                    <span className="font-semibold text-gray-800">{cita.semanas_gestacion ?? '--'} semanas</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${getRiskBadgeStyles(cita.nivel_riesgo)}`}>
                  Riesgo: {cita.nivel_riesgo || 'Bajo'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${getStatusBadgeStyles(cita.estado)}`}>
                  {getStatusLabel(cita.estado)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-100 p-3.5 rounded-xl bg-white shadow-xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha y Hora</span>
                <p className="text-sm font-bold text-gray-900">{formatFullDate(cita.fecha_hora)}</p>
              </div>
              <div className="border border-gray-100 p-3.5 rounded-xl bg-white shadow-xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Obstetra Asignado</span>
                <p className="text-sm font-bold text-gray-900">Dr. {cita.medico_nombre}</p>
              </div>
              <div className="border border-gray-100 p-3.5 rounded-xl bg-white shadow-xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo de Consulta</span>
                <p className="text-sm font-bold text-gray-900">{cita.motivo || 'Control Ordinario'}</p>
              </div>
              <div className="border border-gray-100 p-3.5 rounded-xl bg-white shadow-xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duración Estimada</span>
                <p className="text-sm font-bold text-gray-900">{cita.duracion_minutos} minutos</p>
              </div>
            </div>

            {cita.notas && (
              <div className="border border-gray-100 p-4 rounded-xl bg-amber-50/20 border-l-4 border-l-amber-500">
                <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">Comentarios de Derivación</span>
                <p className="text-xs text-gray-700 leading-relaxed font-medium">{cita.notas}</p>
              </div>
            )}

            {perfil && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="w-1.5 h-4 bg-fuchsia-900 rounded-full" />
                  <h4 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide">Expediente Clínico y Alerta del SAT</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Edad Madre</span>
                    <span className="text-xs font-bold text-gray-900">{perfil.edad_madre ?? '--'} años</span>
                  </div>
                  <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Long. Cervical</span>
                    <span className={`text-xs font-bold ${perfil.longitud_cervical_mm && perfil.longitud_cervical_mm < 25 ? 'text-red-600' : 'text-gray-900'}`}>
                      {perfil.longitud_cervical_mm ?? '--'} mm
                    </span>
                  </div>
                  <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">IMC / BMI</span>
                    <span className="text-xs font-bold text-gray-900">{perfil.bmi ?? '--'}</span>
                  </div>
                  <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">SAT Urgencia</span>
                    <span className={`text-xs font-extrabold ${perfil.nivel_urgencia === 'rojo' ? 'text-rose-600' : 'text-gray-900'}`}>
                      {(perfil.nivel_urgencia || 'bajo').toUpperCase()}
                    </span>
                  </div>
                </div>
                {perfil.prob_consenso != null && (
                  <div className="p-3 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">Probabilidad de Parto Prematuro (ML):</span>
                    <span className="font-extrabold text-fuchsia-900 text-sm">{(Number(perfil.prob_consenso) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {isDoctor ? (
                canAtender ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {cita.estado === 'programada' && (
                      <button
                        type="button"
                        onClick={onIniciarConsulta}
                        className="py-2.5 px-5 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50"
                      >
                        Iniciar consulta
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onAtender}
                      className="py-2.5 px-6 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2 hover:opacity-90 shadow-sm"
                      style={{ backgroundColor: '#612853' }}
                    >
                      Atender y registrar datos clínicos
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 font-bold">✓ Esta cita médica ya concluyó</div>
                )
              ) : (
                <div className="text-xs text-gray-500 font-bold">
                  {cita.estado === 'en_atencion' ? 'Consulta en curso' : cita.estado === 'cumplida' || cita.estado === 'cancelada' ? '✓ Cita finalizada' : 'Cita programada'}
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onVerExpediente}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 border border-gray-200 bg-white"
                >
                  Ver expediente completo
                </button>
                <button type="button" onClick={onClose} className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
