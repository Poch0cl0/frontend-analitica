import { PRIMARY } from '../../constants/theme';
import type { DisponibilidadSlot } from '../../services/citas.api';

interface DisponibilidadSlotsProps {
  slots: DisponibilidadSlot[];
  horaSeleccionada: string;
  isLoading?: boolean;
  motivoNoLaborable?: string | null;
  onSelect: (hora: string) => void;
}

export default function DisponibilidadSlots({
  slots,
  horaSeleccionada,
  isLoading,
  motivoNoLaborable,
  onSelect,
}: DisponibilidadSlotsProps) {
  if (isLoading) {
    return <p className="text-xs text-gray-500">Cargando horarios disponibles...</p>;
  }
  if (motivoNoLaborable) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
        {motivoNoLaborable}
      </p>
    );
  }
  if (slots.length === 0) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
        Sin horarios disponibles para este médico en la fecha seleccionada.
      </p>
    );
  }

  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
        Horarios disponibles
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
        {slots.map((slot) => {
          const selected = horaSeleccionada === slot.hora_inicio;
          const disabled = !slot.disponible;
          return (
            <button
              key={slot.hora_inicio}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(slot.hora_inicio)}
              className={`text-xs py-2 px-1 rounded-lg border font-semibold transition-colors ${
                disabled
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                  : selected
                    ? 'text-white border-fuchsia-900'
                    : 'bg-white text-gray-700 border-fuchsia-200 hover:bg-fuchsia-50'
              }`}
              style={selected && !disabled ? { backgroundColor: PRIMARY } : undefined}
            >
              {slot.hora_inicio}
            </button>
          );
        })}
      </div>
    </div>
  );
}
