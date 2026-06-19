import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './features/auth/Login'; 
import SidebarLayout from './components/SidebarLayout';
import DashboardOverview from './features/dashboard/DashboardOverview';
import {PredictionPanel} from './features/risk-calculator/PredictionPanel';

const UnderConstruction = ({ title }: { title: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6 border border-amber-200">
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Módulo en Desarrollo</h2>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      El módulo de <strong className="text-gray-800">{title}</strong> está siendo implementado para complementar el SAT de Parto Prematuro.
    </p>
    <Link to="/dashboard" className="py-2.5 px-6 rounded-xl text-white font-medium hover:opacity-90 shadow-sm transition-all duration-200" style={{ backgroundColor: '#612853' }}>
      Volver al Dashboard
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <div className="App min-h-screen bg-gray-50/20">
        <Routes>
          {/* Ruta principal: Login */}
          <Route path="/" element={<Login />} />
          
          {/* Rutas con Sidebar Layout */}
          <Route path="/dashboard" element={
            <SidebarLayout>
              <DashboardOverview />
            </SidebarLayout>
          } />
          
          <Route path="/citas" element={
            <SidebarLayout>
              <DashboardOverview />
            </SidebarLayout>
          } />

          <Route path="/pacientes" element={
            <SidebarLayout>
              <UnderConstruction title="Gestión de Pacientes" />
            </SidebarLayout>
          } />

          <Route path="/prediccion" element={
            <SidebarLayout>
              <PredictionPanel />
            </SidebarLayout>
          } />

          <Route path="/triaje" element={
            <SidebarLayout>
              <UnderConstruction title="Módulo de Triaje" />
            </SidebarLayout>
          } />

          <Route path="/recomendaciones" element={
            <SidebarLayout>
              <UnderConstruction title="Recomendaciones Clínicas" />
            </SidebarLayout>
          } />

          <Route path="/usuarios" element={
            <SidebarLayout>
              <UnderConstruction title="Gestión de Usuarios y Roles" />
            </SidebarLayout>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
