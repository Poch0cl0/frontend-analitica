interface CitasFiltersProps {
  searchQuery: string;
  filterFechaDesde: string;
  filterFechaHasta: string;
  filterEstado: string;
  onSearchChange: (v: string) => void;
  onFechaDesdeChange: (v: string) => void;
  onFechaHastaChange: (v: string) => void;
  onEstadoChange: (v: string) => void;
  onClear: () => void;
}

export default function CitasFilters({
  searchQuery,
  filterFechaDesde,
  filterFechaHasta,
  filterEstado,
  onSearchChange,
  onFechaDesdeChange,
  onFechaHastaChange,
  onEstadoChange,
  onClear,
}: CitasFiltersProps) {
  const hasFilters = Boolean(searchQuery || filterFechaDesde || filterFechaHasta || filterEstado);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar paciente</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nombre o DNI..."
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Desde</label>
          <input
            type="date"
            value={filterFechaDesde}
            onChange={(e) => onFechaDesdeChange(e.target.value)}
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hasta</label>
          <input
            type="date"
            value={filterFechaHasta}
            onChange={(e) => onFechaHastaChange(e.target.value)}
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado</label>
          <select
            value={filterEstado}
            onChange={(e) => onEstadoChange(e.target.value)}
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
          >
            <option value="">Todos</option>
            <option value="programada">Programada</option>
            <option value="en_atencion">En atención</option>
            <option value="cumplida">Cumplida</option>
            <option value="cancelada">Cancelada</option>
            <option value="reprogramada">Reprogramada</option>
            <option value="no_asistio_paciente">No asistió paciente</option>
            <option value="no_asistio_medico">No asistió médico</option>
          </select>
        </div>
      </div>
      {hasFilters && (
        <button type="button" onClick={onClear} className="mt-3 text-xs font-semibold text-gray-500 hover:text-gray-700">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
