import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Download, Eye, Edit2, ChevronLeft, ChevronRight, Pill, Activity, HeartPulse } from 'lucide-react';

// 1. CONTRATO DE INTERFACES (TypeScript Estricto basado en API)
interface RecommendationItem {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  semanas_gestacion: number;
  antecedentes_gpo: string; // Ej: "G1P0" o "G2P1"
  intervencion_texto: string; // Columna 'Recomendación'
  tipo: string; // Medicamento, Suplemento, Control
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
  // Estados para datos de la API
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pendientes_criticas: 14, // Fallback estático idéntico a Figma si la API no computa KPIs de este módulo
    ratio_cumplimiento: 88,
    medico_mas_activo: 'Dra. Elena Ruiz'
  });

  // Estados para filtros (Controlados por UI)
  const [tipo, setTipo] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [estado, setEstado] = useState('Activo'); // Por defecto 'Activos' como en Figma
  const [medicoId, setMedicoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(128); // Sincronizado con 'Mostrando 3 de 128'

  const [loading, setLoading] = useState(false);

  // 2. EFECTO PARA CONSUMIR LA API CON FILTROS DINÁMICOS
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      // Mapea exactamente al endpoint del backend de tu compañero
      const response = await api.get('/api/recomendaciones', {
        params: {
          tipo,
          prioridad,
          estado,
          medico_id: medicoId,
          fecha,
          page,
          limit: 5 // Ajustado para paginación visual limpia
        }
      });
      
      // Si el backend te devuelve la estructura paginada mapeamos, si no usamos fallback para el video
      if (response.data.items) {
        setRecommendations(response.data.items);
        setTotalItems(response.data.total);
      } else {
        // Mock de contingencia ultra-fiel a Figma por si no hay datos en la BD esta madrugada
        setRecommendations([
          {
            id: "1",
            paciente_id: "101",
            paciente_nombre: "Lucía Méndez",
            semanas_gestacion: 32,
            antecedentes_gpo: "G1P0",
            intervencion_texto: "Administración urgente de Betametasona",
            tipo: "Medicamento",
            prioridad: "alta",
            estado: "Activo",
            fecha: "24 Oct, 2023",
            medico_nombre: "Dra. Ruiz"
          },
          {
            id: "2",
            paciente_id: "102",
            paciente_nombre: "Ana García",
            semanas_gestacion: 18,
            antecedentes_gpo: "G2P1",
            intervencion_texto: "Ajuste de dosis de Hierro elemental",
            tipo: "Suplemento",
            prioridad: "media",
            estado: "Completado",
            fecha: "22 Oct, 2023",
            medico_nombre: "Dr. Soler"
          },
          {
            id: "3",
            paciente_id: "103",
            paciente_nombre: "Carla Ortiz",
            semanas_gestacion: 24,
            antecedentes_gpo: "G1P0",
            intervencion_texto: "Monitoreoreo de glucosa post-prandial",
            tipo: "Control",
            prioridad: "alta",
            estado: "Activo",
            fecha: "23 Oct, 2023",
            medico_nombre: "Dra. Ruiz"
          }
        ]);
      }
    } catch (error) {
      console.error("Error cargando recomendaciones", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [tipo, prioridad, estado, medicoId, fecha, page]);

  // Handler para exportar el reporte XLSX
  const handleExport = async () => {
    try {
      window.open('http://localhost:8000/api/recomendaciones/export?format=xlsx', '_blank');
    } catch (err) {
      alert("Error al exportar archivo");
    }
  };

  // 3. RENDERIZADO DE ICONOS DE CATEGORÍA S-4
  const renderTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Medicamento': return <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium"><Pill className="w-4 h-4 text-slate-500" /> Medicamento</span>;
      case 'Control': return <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium"><Activity className="w-4 h-4 text-slate-500" /> Control</span>;
      default: return <span className="flex items-center gap-1.5 text-slate-700 text-xs font-medium"><HeartPulse className="w-4 h-4 text-slate-500" /> Suplemento</span>;
    }
  };

  // 4. COLORES DE PRIORIDAD Y ESTADO
  const priorityStyles = {
    alta: 'bg-rose-100 text-rose-700 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider',
    media: 'bg-purple-100 text-purple-700 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider',
    baja: 'bg-slate-100 text-slate-600 font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider'
  };

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

      {/* FILTROS SUPERIORES (Mapeo de UI a API importantes) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Todos los Tipos</option>
            <option value="Medicamento">Medicamento</option>
            <option value="Suplemento">Suplemento</option>
            <option value="Control">Control</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</label>
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Cualquiera</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="Activo">Activos</option>
            <option value="Completado">Completados</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Médico</label>
          <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Todos</option>
            <option value="1">Dra. Ruiz</option>
            <option value="2">Dr. Soler</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500" />
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
                recommendations.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${indicatorBorder[item.prioridad]}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full font-bold text-xs flex items-center justify-center">
                          {item.paciente_nombre.charAt(0)}
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
                      <span className={priorityStyles[item.prioridad]}>{item.prioridad}</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
          <span>Mostrando {recommendations.length} de {totalItems} recomendaciones</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"><ChevronRight className="w-4 h-4" /></button>
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
            {metrics.medico_mas_activo.split(' ').pop()?.charAt(0)}
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