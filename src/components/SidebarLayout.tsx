import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNav } from '../contexts/NavContext';

interface SidebarLayoutProps {
  children: ReactNode;
}

type IconKey = 'LayoutDashboard' | 'Calendar' | 'Users' | 'BrainCircuit' | 'Activity' | 'HeartPulse' | 'ShieldAlert';

interface MenuItem {
  label: string;
  path: string;
  icon: IconKey;
  roles: string[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const SIDEBAR_COLOR = '#612853';

const menuGroups: MenuGroup[] = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: ['medico', 'secretaria', 'administrador'] },
      { label: 'Citas', path: '/citas', icon: 'Calendar', roles: ['medico', 'secretaria', 'administrador'] },
      { label: 'Pacientes', path: '/pacientes', icon: 'Users', roles: ['medico', 'secretaria', 'administrador'] },
    ],
  },
  {
    label: 'MÓDULOS CLÍNICOS',
    items: [
      { label: 'Predicción de Riesgo', path: '/prediccion', icon: 'BrainCircuit', roles: ['medico', 'administrador'] },
      { label: 'Triaje', path: '/triaje', icon: 'Activity', roles: ['medico', 'administrador'] },
      { label: 'Recomendaciones', path: '/recomendaciones', icon: 'HeartPulse', roles: ['medico', 'administrador'] },
    ],
  },
  {
    label: 'GESTIÓN',
    items: [
      { label: 'Usuarios', path: '/usuarios', icon: 'ShieldAlert', roles: ['administrador'] },
    ],
  },
];

const routeInfo: Record<string, { title: string; section: string }> = {
  '/dashboard': { title: 'Dashboard', section: 'Principal' },
  '/citas': { title: 'Citas', section: 'Principal' },
  '/pacientes': { title: 'Pacientes', section: 'Principal' },
  '/prediccion': { title: 'Predicción de Riesgo', section: 'Módulos Clínicos' },
  '/triaje': { title: 'Triaje', section: 'Módulos Clínicos' },
  '/recomendaciones': { title: 'Recomendaciones', section: 'Módulos Clínicos' },
  '/usuarios': { title: 'Usuarios', section: 'Gestión' },
};

const icons: Record<IconKey, (className?: string) => JSX.Element> = {
  LayoutDashboard: (className = 'w-5 h-5') => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  Calendar: (className = 'w-5 h-5') => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Users: (className = 'w-5 h-5') => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  BrainCircuit: (className = 'w-5 h-5') => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Activity: (className = 'w-5 h-5') => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  HeartPulse: (className = 'w-5 h-5') => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  ShieldAlert: (className = 'w-5 h-5') => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

function formatNavbarDate(): string {
  const now = new Date();
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayName = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { dynamicTitle, dynamicBreadcrumb } = useNav();
  const userRole = localStorage.getItem('user_role') || 'medico';
  const userEmail = localStorage.getItem('user_email') || '';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'administrador': return 'Administrador';
      case 'secretaria': return 'Secretaría';
      case 'medico':
      default: return 'Médico Obstetra';
    }
  };

  const getUserInitials = () => {
    if (userEmail) {
      const parts = userEmail.split('@')[0].split('.');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    return getRoleLabel(userRole).substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    navigate('/');
  };

  const currentRoute = routeInfo[location.pathname] || { title: 'Panel', section: 'Principal' };
  const navTitle = dynamicTitle ?? currentRoute.title;
  const navBreadcrumb = dynamicBreadcrumb ?? [{ label: currentRoute.section }, { label: currentRoute.title }];

  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);

  const renderSidebarContent = () => (
    <>
      {/* LOGO */}
      <div className="h-20 flex items-center gap-3 px-5 flex-shrink-0">
        <img
          src="/logo.png"
          alt="Obstetricare"
          className="w-10 h-10 object-contain"
        />
        <div>
          <span className="text-lg font-bold text-white tracking-tight">Obstetricare</span>
          <span className="block text-[10px] text-white/60 font-medium -mt-0.5">Maternal-Fetal Medicine</span>
        </div>
      </div>

      {/* SEPARADOR */}
      <div className="mx-5 border-t border-white/15" />

      {/* MENÚ POR GRUPOS */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-5">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase px-2 mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {icons[item.icon](
                      `w-5 h-5 flex-shrink-0 ${isActive ? '' : 'opacity-80'}`
                    )}
                    <span
                      style={isActive ? { color: SIDEBAR_COLOR } : {}}
                      className={isActive ? 'font-bold' : ''}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* PERFIL DE USUARIO */}
      <div className="p-4 flex-shrink-0 border-t border-white/15">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {userEmail || 'Usuario'}
            </p>
            <p className="text-xs text-white/60 font-medium truncate">{getRoleLabel(userRole)}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50/50">

      {/* ═══ SIDEBAR DESKTOP ═══ */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 shrink-0"
        style={{ backgroundColor: SIDEBAR_COLOR }}
      >
        {renderSidebarContent()}
      </aside>

      {/* ═══ ÁREA PRINCIPAL (TOPBAR + CONTENIDO) ═══ */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* ─── TOPBAR / NAVBAR SUPERIOR ─── */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          {/* IZQUIERDA: Título de sección + breadcrumb */}
          <div className="flex items-center gap-3">
            {/* Botón hamburguesa en móvil */}
            <button
              className="md:hidden p-1.5 text-gray-500 rounded-lg hover:bg-gray-100 mr-1"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">{navTitle}</h1>
              <p className="text-xs text-gray-400 font-medium leading-tight flex items-center flex-wrap gap-x-1">
                {navBreadcrumb.map((item, i) => (
                  <span key={i} className="flex items-center gap-x-1">
                    {i > 0 && <span className="text-gray-300">›</span>}
                    {item.path ? (
                      <Link to={item.path} className="text-gray-500 hover:underline">{item.label}</Link>
                    ) : i === navBreadcrumb.length - 1 ? (
                      <span style={{ color: SIDEBAR_COLOR }} className="font-semibold">{item.label}</span>
                    ) : (
                      <span className="text-gray-500">{item.label}</span>
                    )}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* DERECHA: Fecha + Notificaciones + Avatar */}
          <div className="flex items-center gap-4">
            {/* Fecha actual */}
            <span className="hidden sm:block text-sm font-medium text-gray-500 select-none">
              {formatNavbarDate()}
            </span>

            {/* Campana de notificaciones */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Badge */}
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center"
                style={{ backgroundColor: SIDEBAR_COLOR }}
              >
                4
              </span>
            </button>

            {/* Separador */}
            <div className="w-px h-6 bg-gray-200" />

            {/* Avatar de usuario */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-sm ring-2 ring-white"
                style={{ backgroundColor: SIDEBAR_COLOR }}
              >
                {getUserInitials()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[100px]">
                  {userEmail ? userEmail.split('@')[0] : 'Usuario'}
                </p>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">{getRoleLabel(userRole)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ─── CONTENIDO PRINCIPAL ─── */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ═══ MENÚ MÓVIL OVERLAY ═══ */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Sidebar móvil */}
          <aside
            className="w-72 flex flex-col h-full shadow-2xl"
            style={{ backgroundColor: SIDEBAR_COLOR }}
          >
            {renderSidebarContent()}
          </aside>
          {/* Overlay oscuro */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
