import { useState, type FormEvent } from 'react';
import {
  cancelarCitaConMotivo,
  marcarAusenciaCita,
  type CitaResponseEnriquecida,
} from '../../../services/api';
import { PRIMARY } from '../../../constants/theme';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import { citaPermiteAusencia, formatCitaFechaHora } from '../../../utils/citaTime';

interface CitaSlotAccionesModalProps {
  cita: CitaResponseEnriquecida;
  onClose: () => void;
  onUpdated: () => void;
  onReprogramar: (cita: CitaResponseEnriquecida) => void;
}

export default function CitaSlotAccionesModal({
  cita,
  onClose,
  onUpdated,
  onReprogramar,
}: CitaSlotAccionesModalProps) {
  const [modo, setModo] = useState<'menu' | 'ausencia' | 'cancelar'>('menu');
  const [motivo, setMotivo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeAccionar = ['programada', 'en_atencion'].includes(cita.estado);
  const permiteAusencia = citaPermiteAusencia(cita.fecha_hora);

  const handleAusencia = async (tipo: 'paciente' | 'medico') => {
    setIsSaving(true);
    setError(null);
    try {
      await marcarAusenciaCita(cita.id, { tipo, motivo: motivo || undefined });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'No se pudo registrar la ausencia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelar = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await cancelarCitaConMotivo(cita.id, motivo || undefined);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'No se pudo cancelar');
    } finally {
      setIsSaving(false);
    }
  };

  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="font-extrabold text-lg">Cita #{cita.id}</h3>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <p><strong>Paciente:</strong> {cita.paciente_nombre}</p>
          <p><strong>Médico:</strong> {cita.medico_nombre}</p>
          <p><strong>Fecha:</strong> {formatCitaFechaHora(cita.fecha_hora)}</p>
          <p><strong>Estado:</strong> <span className="font-bold capitalize">{cita.estado.replace(/_/g, ' ')}</span></p>
          {cita.motivo_cierre && <p className="text-gray-500 text-xs">{cita.motivo_cierre}</p>}
          {error && <p className="text-red-600 text-xs">{error}</p>}

          {modo === 'menu' && puedeAccionar && (
            <div className="grid grid-cols-1 gap-2 pt-2">
              <button type="button" onClick={() => onReprogramar(cita)} className="py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PRIMARY }}>
                Reprogramar
              </button>
              <button
                type="button"
                disabled={!permiteAusencia}
                onClick={() => { if (permiteAusencia) setModo('ausencia'); }}
                className="py-2.5 rounded-xl text-sm font-semibold border border-amber-200 text-amber-800 bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title={!permiteAusencia ? 'Solo cuando llegue la hora de la cita' : undefined}
              >
                Marcar no asistió
              </button>
              {!permiteAusencia && (
                <p className="text-[10px] text-amber-700">
                  La ausencia solo puede registrarse desde {formatCitaFechaHora(cita.fecha_hora)} (hora Perú).
                </p>
              )}
              <button type="button" onClick={() => setModo('cancelar')} className="py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-700 bg-red-50">
                Cancelar cita
              </button>
            </div>
          )}

          {modo === 'ausencia' && (
            <div className="space-y-2">
              {!permiteAusencia && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  Esta cita es futura. Espere a la hora programada o cancele/reprograme.
                </p>
              )}
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" className="w-full text-sm px-3 py-2 border rounded-xl" />
              <button type="button" disabled={isSaving || !permiteAusencia} onClick={() => handleAusencia('paciente')} className="w-full py-2 rounded-xl text-sm font-bold bg-amber-100 text-amber-900 disabled:opacity-40">
                No asistió la paciente
              </button>
              <button type="button" disabled={isSaving || !permiteAusencia} onClick={() => handleAusencia('medico')} className="w-full py-2 rounded-xl text-sm font-bold bg-rose-100 text-rose-900 disabled:opacity-40">
                No asistió el médico
              </button>
              <button type="button" onClick={() => setModo('menu')} className="text-xs text-gray-500">Volver</button>
            </div>
          )}

          {modo === 'cancelar' && (
            <form onSubmit={handleCancelar} className="space-y-2">
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de cancelación" className="w-full text-sm px-3 py-2 border rounded-xl" />
              <button type="submit" disabled={isSaving} className="w-full py-2 rounded-xl text-sm font-bold bg-red-600 text-white">Confirmar cancelación</button>
              <button type="button" onClick={() => setModo('menu')} className="text-xs text-gray-500">Volver</button>
            </form>
          )}

          {!puedeAccionar && (
            <p className="text-xs text-gray-500 pt-2">Esta cita ya está cerrada. Solo consulta.</p>
          )}
        </div>
      </div>
    </div>
  );
}
