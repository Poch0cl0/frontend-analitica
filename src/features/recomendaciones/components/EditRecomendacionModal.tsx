import { useState } from 'react';
import type { FormEvent } from 'react';
import type { RecomendacionListItem, RecomendacionUpdatePayload } from '../../../services/api';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';

const PRIMARY = '#612853';

interface EditRecomendacionModalProps {
  item: RecomendacionListItem;
  onClose: () => void;
  onSave: (id: number, data: RecomendacionUpdatePayload) => Promise<void>;
}

export default function EditRecomendacionModal({ item, onClose, onSave }: EditRecomendacionModalProps) {
  const [estado, setEstado] = useState(item.estado);
  const [prioridad, setPrioridad] = useState(item.prioridad || 'media');
  const [notas, setNotas] = useState('');
  const [fechaRevision, setFechaRevision] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(item.id, {
        estado: estado as RecomendacionUpdatePayload['estado'],
        prioridad: prioridad as RecomendacionUpdatePayload['prioridad'],
        notas: notas || undefined,
        fecha_revision: fechaRevision || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'No se pudo actualizar la recomendación');
    } finally {
      setSaving(false);
    }
  };

  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" {...backdrop}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: PRIMARY }}>
          <h3 className="font-bold text-white text-lg">Editar recomendación</h3>
          <p className="text-fuchsia-200 text-xs mt-0.5 truncate">{item.titulo}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="activo">Activo</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Fecha de revisión</label>
            <input
              type="date"
              value={fechaRevision}
              onChange={(e) => setFechaRevision(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none"
              placeholder="Notas clínicas opcionales"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
