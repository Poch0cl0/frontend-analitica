import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Obtener rol del localStorage
  const userRole = localStorage.getItem('user_role') || 'medico';
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'administrador':
        return 'Administrador';
      case 'secretaria':
        return 'Secretaría';
      case 'medico':
      default:
        return 'Médico Obstetra';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/');
  };

  // Íconos SVG personalizados
  const icons = {
    LayoutDashboard: (className = "w-5 h-5") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ),
    Calendar: (className = "w-5 h-5") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    Users: (className = "w-5 h-5") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    BrainCircuit: (className = "w-5 h-5") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    Activity: (className = "w-5 h-5") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    HeartPulse: (className = "w-5 h-5") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    ShieldAlert: (className = "w-5 h-5") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' as const },
    { label: 'Citas', path: '/citas', icon: 'Calendar' as const },
    { label: 'Pacientes', path: '/pacientes', icon: 'Users' as const },
    { label: 'Predicción de Riesgo', path: '/prediccion', icon: 'BrainCircuit' as const },
    { label: 'Triaje', path: '/triaje', icon: 'Activity' as const },
    { label: 'Recomendaciones', path: '/recomendaciones', icon: 'HeartPulse' as const },
    { label: 'Usuarios', path: '/usuarios', icon: 'ShieldAlert' as const },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50/50">
      {/* SIDEBAR PARA PANTALLAS GRANDES */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 shrink-0">
        {/* LOGO */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: '#612853' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900">Obstetri<span style={{ color: '#612853' }}>Care</span></span>
            <span className="block text-[10px] text-gray-500 font-medium tracking-wider -mt-1 uppercase">SAT PREMATURO</span>
          </div>
        </div>

        {/* MENÚ DE NAVEGACIÓN */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: '#612853' } : {}}
              >
                {icons[item.icon](`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* PERFIL DE USUARIO */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-700 bg-white border border-gray-200">
              {userRole.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">ObstetriCare User</p>
              <p className="text-xs text-gray-500 font-medium truncate">{getRoleLabel(userRole)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* VERSIÓN MÓVIL - CABECERA */}
      <div className="md:hidden w-full flex flex-col min-h-screen">
        <header className="h-16 flex items-center justify-between px-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: '#612853' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Obstetri<span style={{ color: '#612853' }}>Care</span></span>
          </div>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none"
          >
            {isMobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </header>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        {isMobileOpen && (
          <div className="fixed inset-0 top-16 z-40 bg-white flex flex-col border-t border-gray-100">
            <nav className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: '#612853' } : {}}
                  >
                    {icons[item.icon](`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`)}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-700 bg-white border border-gray-200">
                  {userRole.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">ObstetriCare User</p>
                  <p className="text-xs text-gray-500">{getRoleLabel(userRole)}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 py-2 px-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Salir</span>
              </button>
            </div>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL PARA DISPOSITIVOS MÓVILES */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>

      {/* CONTENIDO PRINCIPAL PARA PANTALLAS GRANDES */}
      <main className="hidden md:flex md:flex-col md:flex-1 md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
