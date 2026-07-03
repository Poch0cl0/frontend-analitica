import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRecomendaciones,
  getMedicos,
  updateRecomendacion,
  type RecomendacionListItem,
  type MedicoResumen,
} from '../../services/api';
import { API_BASE_URL } from '../../services/client';
import { Download, Eye, Edit2, ChevronLeft, ChevronRight, Pill, Activity, HeartPulse } from 'lucide-react';
import EditRecomendacionModal from './components/EditRecomendacionModal';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'farmacologica', label: 'Farmacológica' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'conducta', label: 'Conducta' },
  { value: 'quirurgica', label: 'Quirúrgica' },
  { value: 'interconsulta', label: 'Interconsulta' },
  { value: 'laboratorio', label: 'Laboratorio' },
];

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'completado', label: 'Completados' },
];

function tipoLabel(tipo: string | null): string {
  const found = TIPO_OPTIONS.find((o) => o.value === tipo);
  return found?.label ?? tipo ?? '—';
}

function computeMetrics(items: RecomendacionListItem[]) {
  const pendientesCriticas = items.filter(
    (i) => i.prioridad === 'alta' && (i.estado === 'activo' || i.estado === 'pendiente'),
  ).length;
  const completadas = items.filter((i) => i.estado === 'completado').length;
  const ratioCumplimiento = items.length > 0 ? Math.round((completadas / items.length) * 100) : 0;

  const medicoCounts: Record<string, number> = {};
  for (const item of items) {
    const name = item.medico_nombre || 'Sin asignar';
    medicoCounts[name] = (medicoCounts[name] || 0) + 1;
  }
  const medicoMasActivo = Object.entries(medicoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return { pendientesCriticas, ratioCumplimiento, medicoMasActivo };
}

export function RecommendationsList() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecomendacionListItem[]>([]);
  const [kpiItems, setKpiItems] = useState<RecomendacionListItem[]>([]);
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [editingItem, setEditingItem] = useState<RecomendacionListItem | null>(null);

  const [tipo, setTipo] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [estado, setEstado] = useState('');
  const [medicoId, setMedicoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const itemsPerPage = 5;

  const metrics = useMemo(() => computeMetrics(kpiItems), [kpiItems]);

  const fetchKpis = useCallback(async () => {
    try {
      const data = await getRecomendaciones({ page: 1, limit: 500 });
      setKpiItems(data.items);
    } catch {
      setKpiItems([]);
    }
  }, []);

  useEffect(() => {
    getMedicos().then(setMedicos).catch(() => setMedicos([]));
    fetchKpis();
  }, [fetchKpis]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const params = {
          ...(tipo && { tipo }),
          ...(prioridad && { prioridad }),
          ...(estado && { estado }),
          ...(medicoId && { medico_id: Number(medicoId) }),
          ...(fecha && { fecha }),
          page,
          limit: itemsPerPage,
        };
        const data = await getRecomendaciones(params);
        setRecommendations(data.items);
        setTotalItems(data.total);
      } catch {
        setRecommendations([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [tipo, prioridad, estado, medicoId, fecha, page]);

  const handleExport = async () => {
    try {
      const baseUrl = API_BASE_URL;
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${baseUrl}/api/recomendaciones/export?format=xlsx`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'recomendaciones.xlsx';
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert('Error al exportar archivo');
    }
  };

  const handleSaveEdit = async (id: number, data: Parameters<typeof updateRecomendacion>[1]) => {
    await updateRecomendacion(id, data);
    await fetchKpis();
    const refreshed = await getRecomendaciones({
      ...(tipo && { tipo }),
      ...(prioridad && { prioridad }),
      ...(estado && { estado }),
      ...(medicoId && { medico_id: Number(medicoId) }),
      ...(fecha && { fecha }),
      page,
      limit: itemsPerPage,
    });
    setRecommendations(refreshed.items);
    setTotalItems(refreshed.total);
  };

  const renderTipoIcon = (tipoStr: string | null) => {
    const label = tipoLabel(tipoStr);
    if (tipoStr === 'farmacologica') {
      return (
        <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
          <Pill className="w-4 h-4 text-slate-500" /> {label}
        </span>
      );
    }
    if (tipoStr === 'seguimiento') {
      return (
        <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
          <Activity className="w-4 h-4 text-slate-500" /> {label}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
        <HeartPulse className="w-4 h-4 text-slate-500" /> {label}
      </span>
    );
  };

  const priorityStyles = {
    alta: 'bg-rose-100 text-rose-700 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider',
    media: 'bg-purple-100 text-purple-700 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider',
    baja: 'bg-slate-100 text-slate-600 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider',
  };

  const indicatorBorder = {
    alta: 'border-l-4 border-rose-600',
    media: 'border-l-4 border-purple-600',
    baja: 'border-l-4 border-slate-400',
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Recomendaciones</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Monitoreo y seguimiento de recomendaciones clínicas automatizadas.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition"
        >
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {TIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</label>
          <select
            value={prioridad}
            onChange={(e) => { setPrioridad(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Cualquiera</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Médico</label>
          <select
            value={medicoId}
            onChange={(e) => { setMedicoId(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} {m.apellidos}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => { setFecha(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-purple-50/40 text-[11px] font-bold text-purple-900/60 uppercase tracking-wider">
                <th className="py-3 px-6">Paciente</th>
                <th className="py-3 px-4">Recomendación</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Prioridad</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Médico</th>
                <th className="py-3 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 font-semibold text-slate-400">
                    Actualizando listado...
                  </td>
                </tr>
              ) : recommendations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 font-semibold text-slate-400">
                    No hay recomendaciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                recommendations.map((item) => {
                  const safePrioridad = (item.prioridad?.toLowerCase() as 'alta' | 'media' | 'baja') || 'baja';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className={`py-4 px-6 ${indicatorBorder[safePrioridad]}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full font-bold text-xs flex items-center justify-center">
                            {item.paciente_nombre?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.paciente_nombre}</p>
                            {item.semanas_gestacion != null && (
                              <p className="text-[11px] text-slate-400 font-semibold">
                                Semana {item.semanas_gestacion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-800 max-w-xs">{item.titulo}</td>
                      <td className="py-4 px-4">{renderTipoIcon(item.tipo)}</td>
                      <td className="py-4 px-4">
                        <span className={priorityStyles[safePrioridad]}>{safePrioridad}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 capitalize">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.estado === 'activo' || item.estado === 'pendiente'
                                ? 'bg-rose-600'
                                : 'bg-slate-400'
                            }`}
                          />
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-slate-500">{item.fecha}</td>
                      <td className="py-4 px-4 text-xs font-bold text-slate-700">{item.medico_nombre ?? '—'}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center gap-3 text-slate-400">
                          <button
                            type="button"
                            title="Ver paciente"
                            onClick={() => navigate(`/recomendaciones/${item.paciente_id}`)}
                            className="hover:text-purple-700 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => setEditingItem(item)}
                            className="hover:text-purple-700 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
          <span>Mostrando {recommendations.length} de {totalItems} recomendaciones</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-500">Pág. {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * itemsPerPage >= totalItems}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200/70">Pendientes Críticas</p>
          <h3 className="text-4xl font-extrabold mt-2">{metrics.pendientesCriticas}</h3>
          <div className="absolute right-4 bottom-0 opacity-10 transform translate-y-2">
            <Activity className="w-24 h-24" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ratio de Cumplimiento</p>
            <h3 className="text-4xl font-extrabold text-slate-800 mt-2">{metrics.ratioCumplimiento}%</h3>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-purple-900 h-full rounded-full"
              style={{ width: `${metrics.ratioCumplimiento}%` }}
            />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold text-lg">
            {metrics.medicoMasActivo?.split(' ').pop()?.charAt(0) || 'M'}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Médico más Activo</p>
            <h3 className="text-base font-bold text-slate-800 mt-1">{metrics.medicoMasActivo}</h3>
          </div>
        </div>
      </div>

      {editingItem && (
        <EditRecomendacionModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
