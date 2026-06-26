import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { getFeedbackEstadisticas } from '../../services/api';
import type { FeedbackEstadisticasResponse } from '../../services/api';
import { ThumbsUp, ThumbsDown, BarChart3, TrendingUp } from 'lucide-react';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
const CHART_COLOR = '#612853';

export default function FeedbackAnalytics() {
  const [data, setData] = useState<FeedbackEstadisticasResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeedbackEstadisticas()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.total_votos === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
        <BarChart3 className="w-16 h-16 mb-4 stroke-1" />
        <p className="text-lg font-semibold text-gray-500">Sin datos de feedback</p>
        <p className="text-sm">Aún no hay votos registrados sobre predicciones.</p>
      </div>
    );
  }

  const modeloData = data.por_modelo.map((m) => ({
    name: m.modelo ?? 'Sin modelo',
    Correctos: m.correctos,
    Incorrectos: m.incorrectos,
    precision: +(m.precision * 100).toFixed(1),
  }));

  const temporalData = data.temporal.map((t) => ({
    fecha: t.fecha,
    Precisión: +(t.precision * 100).toFixed(1),
    Votos: t.total,
  }));

  const pieData = [
    { name: 'Correctos', value: data.total_correctos },
    { name: 'Incorrectos', value: data.total_incorrectos },
  ];

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-800">Rendimiento de Modelos</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Votos</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{data.total_votos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Correctos</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{data.total_correctos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Incorrectos</p>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-1">{data.total_incorrectos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-fuchsia-600" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Precisión Global</p>
          </div>
          <p className="text-3xl font-bold mt-1" style={{ color: CHART_COLOR }}>
            {(data.precision_global * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Barras por modelo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Votos por Modelo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modeloData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Correctos" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Incorrectos" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Precisión por modelo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Precisión por Modelo (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modeloData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="precision" fill={CHART_COLOR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendencia temporal */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Precisión a lo largo del tiempo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="Precisión"
                stroke={CHART_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: CHART_COLOR }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pastel correctos/incorrectos */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Distribución Global</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
