import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Download, Eye, Edit2, ChevronLeft, ChevronRight, Pill, Activity, HeartPulse } from 'lucide-react';

interface RecommendationItem {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  semanas_gestacion: number;
  antecedentes_gpo: string;
  intervencion_texto: string;
  tipo: string;
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'Activo' | 'Completado';
  fecha: string;
  medico_nombre: string;
}

interface DashboardMetrics {
  pendientes_criticas: number;
  ratio_cumplimiento: number;
  medico_mas_activo: string;
}

export const RecommendationsList: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [metrics] = useState<DashboardMetrics>({
    pendientes_criticas: 14, 
    ratio_cumplimiento: 88,
    medico_mas_activo: 'Dra. Elena Ruiz'
  });

  const [tipo, setTipo] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [estado, setEstado] = useState('');
  const [medicoId, setMedicoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(128); 
  const [loading, setLoading] = useState(false);

  const itemsPerPage = 5;

  // CORRECCIÓN: Función metida dentro del useEffect para resolver advertencias de hooks de React y aislar dependencias
useEffect(() => {
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      // Limpiamos los parámetros vacíos para no enviar strings vacíos al backend si no son necesarios
      const params = {
        ...(tipo && { tipo }),
        ...(prioridad && { prioridad }),
        ...(estado && { estado }),
        ...(medicoId && { medico_id: medicoId }),
        ...(fecha && { fecha }),
        page,
        limit: itemsPerPage
      };

      const response = await api.get('/api/recomendaciones', { params });
      
      // MANEJO FLEXIBLE: Soporta las dos formas en las que el backend puede responder
      if (response.data && Array.isArray(response.data.items)) {
        // Formato paginado { items: [], total: 0 }
        setRecommendations(response.data.items);
        setTotalItems(response.data.total || response.data.items.length);
      } else if (Array.isArray(response.data)) {
        // Formato array directo [ {...}, {...} ]
        setRecommendations(response.data);
        setTotalItems(response.data.length);
      } else {
        // Por si el backend responde algo totalmente distinto
        setRecommendations([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      console.error("Detalle del error en recomendaciones:", error.response || error);
      // Evitamos que muestre los datos de prueba (Mock) si hay un error real de backend
      setRecommendations([]); 
    } finally {
      setLoading(false);
    }
  };

  fetchRecommendations();
}, [tipo, prioridad, estado, medicoId, fecha, page]);

  const handleExport = async () => {
    try {
      window.open('http://localhost:8000/api/recomendaciones/export?format=xlsx', '_blank');
    } catch (err) {
      alert("Error al exportar archivo");
    }
  };

  const renderTipoIcon = (tipoStr: string) => {
    switch (tipoStr) {
      case 'Medicamento': return <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium"><Pill className="w-4 h-4 text-slate-500" /> Medicamento</span>;
      case 'Control': return <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium"><Activity className="w-4 h-4 text-slate-500" /> Control</span>;
      default: return <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium"><HeartPulse className="w-4 h-4 text-slate-500" /> Suplemento</span>;
    }
  };

  const priorityStyles = {
    alta: 'bg-rose-100 text-rose-700 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider',
    media: 'bg-purple-100 text-purple-700 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider',
    baja: 'bg-slate-100 text-slate-600 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider'
  };

  // Mapeo seguro para bordes izquierdos en celdas
  const indicatorBorder = {
    alta: 'border-l-4 border-rose-600',
    media: 'border-l-4 border-purple-600',
    baja: 'border-l-4 border-slate-400'
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans space-y-6">
      
      {/* HEADER Y BOTÓN EXPORTAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Recomendaciones</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">Monitoreo y seguimiento de recomendaciones clínicas automatizadas.</p>
        </div>
        <button onClick={handleExport} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      {/* FILTROS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setPage(1); }} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Todos los Tipos</option>
            <option value="Medicamento">Medicamento</option>
            <option value="Suplemento">Suplemento</option>
            <option value="Control">Control</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</label>
          <select value={prioridad} onChange={(e) => { setPrioridad(e.target.value); setPage(1); }} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Cualquiera</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="Activo">Activos</option>
            <option value="Completado">Completados</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Médico</label>
          <select value={medicoId} onChange={(e) => { setMedicoId(e.target.value); setPage(1); }} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Todos</option>
            <option value="1">Dra. Ruiz</option>
            <option value="2">Dr. Soler</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setPage(1); }} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
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
                <tr><td colSpan={8} className="text-center py-8 font-semibold text-slate-400">Actualizando listado...</td></tr>
              ) : (
                recommendations.map((item) => {
                  const safePrioridad = (item.prioridad?.toLowerCase() as 'alta' | 'media' | 'baja') || 'baja';
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* CORRECCIÓN: El borde izquierdo del indicador de color ahora se aplica a este primer TD, garantizando su renderizado CSS */}
                      <td className={`py-4 px-6 ${indicatorBorder[safePrioridad]}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full font-bold text-xs flex items-center justify-center">
                            {item.paciente_nombre?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.paciente_nombre}</p>
                            <p className="text-[11px] text-slate-400 font-semibold">Semana {item.semanas_gestacion} • {item.antecedentes_gpo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-800 max-w-xs">{item.intervencion_texto}</td>
                      <td className="py-4 px-4">{renderTipoIcon(item.tipo)}</td>
                      <td className="py-4 px-4">
                        <span className={priorityStyles[safePrioridad]}>{safePrioridad}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <span className={`w-1.5 h-1.5 rounded-full ${item.estado === 'Activo' ? 'bg-rose-600' : 'bg-slate-400'}`}></span>
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-slate-500">{item.fecha}</td>
                      <td className="py-4 px-4 text-xs font-bold text-slate-700">{item.medico_nombre}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center gap-3 text-slate-400">
                          <button className="hover:text-purple-700 transition"><Eye className="w-4 h-4" /></button>
                          <button className="hover:text-purple-700 transition"><Edit2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
          <span>Mostrando {recommendations.length} de {totalItems} recomendaciones</span>
          <div className="flex items-center gap-2">
            {/* CORRECCIÓN: disabled añadido dinámicamente para bloquear la navegación fuera de límites reales */}
            <button 
              onClick={() => setPage(p => Math.max(p - 1, 1))} 
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => p + 1)} 
              disabled={page * itemsPerPage >= totalItems}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS INFERIORES DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200/70">Pendientes Críticas</p>
          <h3 className="text-4xl font-extrabold mt-2">{metrics.pendientes_criticas}</h3>
          <div className="absolute right-4 bottom-0 opacity-10 transform translate-y-2">
            <Activity className="w-24 h-24" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ratio de Cumplimiento</p>
            <h3 className="text-4xl font-extrabold text-slate-800 mt-2">{metrics.ratio_cumplimiento}%</h3>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-purple-900 h-full rounded-full" style={{ width: `${metrics.ratio_cumplimiento}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold text-lg">
            {metrics.medico_mas_activo?.split(' ').pop()?.charAt(0) || 'M'}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Médico más Activo</p>
            <h3 className="text-base font-bold text-slate-800 mt-1">{metrics.medico_mas_activo}</h3>
          </div>
        </div>
      </div>

    </div>
  );
};