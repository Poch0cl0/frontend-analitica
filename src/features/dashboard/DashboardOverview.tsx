import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  api,
  getDashboardResumen,
  getCitas,
  getCitaById,
  changeCitaEstado,
  getMedicos,
  getPacientesFiltered,
  createPaciente,
  getTriajeResumen,
  createAndAnalizarDatosClinicos,
  updateAndAnalizarDatosClinicos,
} from '../../services/api';
import type {
  DashboardResumen,
  CitaResponseEnriquecida,
  MedicoResumen,
  PacienteResponse,
  PacienteCreate,
  TriajeResumen,
} from '../../services/api';
import {
  DcAtenderFormView,
  atenderFormToPayload,
  emptyAtenderForm,
  validateAtenderForm,
  type DcAtenderForm,
} from '../../components/DatosClinicosAtenderForm';
import { useUserRole } from '../../hooks/useUserRole';
import { loadAtenderFormForPaciente } from '../../utils/atenderFormLoader';
import type { DatosClinicosResponse } from '../../services/api';
import { sortCitasPorProximidad } from '../../utils/citaTime';
import CreateCitaModal from '../citas/components/CreateCitaModal';
import EditCitaModal, { type EditCitaForm } from '../citas/components/EditCitaModal';
import DeleteCitaModal from '../citas/components/DeleteCitaModal';
import { useCitaActions } from '../../hooks/useCitaActions';
import AdminAnalyticsPanel from './AdminAnalyticsPanel';
import OperativoDashboardPanel from './OperativoDashboardPanel';
import ExpedienteInteligenteModal from '../expediente-inteligente/ExpedienteInteligenteModal';

// ==================== TIPOS ADICIONALES ====================

interface PacientePerfilResponse {
  id: number;
  dni: string;
  nombre: string;
  apellidos: string;
  telefono_principal: string | null;
  email: string | null;
  edad_madre: number | null;
  edad_gestacional_semanas: number | null;
  longitud_cervical_mm: number | null;
  embarazo_multiple: number | null;
  parto_prematuro_previo: boolean | null;
  hipertension_gestacional: boolean | null;
  bmi: number | null;
  num_condiciones_cronicas: number | null;
  infeccion_activa: boolean | null;
  prob_consenso: number | null;
  nivel_riesgo: string | null;
  semanas_estimadas_consenso: number | null;
  nivel_urgencia: string | null;
  medico_nombre: string | null;
  fecha_ultima_prediccion: string | null;
  fecha_ultimo_triage: string | null;
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function DashboardOverview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDoctor, isAdmin } = useUserRole();
  const isSecretary = !isDoctor && !isAdmin;

  // Estados del Dashboard
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [triajeResumen, setTriajeResumen] = useState<TriajeResumen | null>(null);
  const [citasHoy, setCitasHoy] = useState<CitaResponseEnriquecida[]>([]);
  const [allCitas, setAllCitas] = useState<CitaResponseEnriquecida[]>([]); // NEW
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  
  // Derivar pacientes sin cita
  const pacientesSinCita = pacientes.filter(p => 
    !allCitas.some(c => c.paciente_id === p.id && (c.estado === 'programada' || c.estado === 'en_atencion'))
  );
  
  // Estados de control
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Modales
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'detail' | 'delete' | 'patientsWithoutAppointment' | 'registerPatient' | 'atender' | null>(null);
  const [selectedCitaId, setSelectedCitaId] = useState<number | null>(null);
  const [selectedCitaDetail, setSelectedCitaDetail] = useState<CitaResponseEnriquecida | null>(null);
  const [selectedPatientPerfil, setSelectedPatientPerfil] = useState<PacientePerfilResponse | null>(null);
  const [isLoadingPerfil, setIsLoadingPerfil] = useState<boolean>(false);
  const [preselectedPatientId, setPreselectedPatientId] = useState<number | null>(null);

  // Expediente Inteligente Modal
  const [showExpedienteModal, setShowExpedienteModal] = useState(false);
  const [expedientePacienteId, setExpedientePacienteId] = useState<number | null>(null);

  // Atender cita (médico)
  const [atenderDcForm, setAtenderDcForm] = useState<DcAtenderForm>(emptyAtenderForm);
  const [existingDc, setExistingDc] = useState<DatosClinicosResponse | null>(null);
  const [dcExists, setDcExists] = useState(false);
  const [isSavingAtender, setIsSavingAtender] = useState(false);

  // Estados de los Formularios
  // 1. Registro Rápido de Paciente
  const [quickPatient, setQuickPatient] = useState<PacienteCreate>({
    dni: '',
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    telefono_principal: '',
    email: '',
    medico_asignado_id: undefined
  });
  const [isRegisteringPatient, setIsRegisteringPatient] = useState<boolean>(false);

  // 2. Crear Cita
  const [newCita, setNewCita] = useState<{
    paciente_id: string;
    medico_id: string;
    fecha: string;
    hora: string;
    notas: string;
    duracion_minutos: number;
  }>({
    paciente_id: '',
    medico_id: '',
    fecha: '',
    hora: '',
    notas: '',
    duracion_minutos: 30
  });
  const [isCreatingCita, setIsCreatingCita] = useState<boolean>(false);
  const [pacientesSinCitaList, setPacientesSinCitaList] = useState<PacienteResponse[]>([]);

  // 3. Editar Cita
  const [editCitaForm, setEditCitaForm] = useState<EditCitaForm>({
    fecha: '',
    hora: '',
    medico_id: '',
    estado: 'programada',
    notas: '',
    duracion_minutos: 30,
  });
  const [isUpdatingCita, setIsUpdatingCita] = useState<boolean>(false);

  // ==================== EFECTOS DE CARGA INICIAL ====================

  const loadData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setErrorMsg(null);
    try {
      const todayDate = new Date();
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      const localTodayStr = `${year}-${month}-${day}`;

      const requests: Promise<unknown>[] = [
        getDashboardResumen(),
        getCitas(localTodayStr),
        getCitas(),
        getMedicos(),
        getPacientesFiltered({ estado: 'activo', limit: 100 }),
      ];
      if (isDoctor) {
        requests.push(getTriajeResumen());
      }

      const results = await Promise.allSettled(requests);

      const resumenResult = results[0];
      if (resumenResult.status === 'rejected') {
        throw resumenResult.reason;
      }
      setResumen(resumenResult.value as DashboardResumen);

      if (results[1].status === 'fulfilled') {
        setCitasHoy(sortCitasPorProximidad(results[1].value as CitaResponseEnriquecida[]));
      }

      if (results[2].status === 'fulfilled') {
        setAllCitas(sortCitasPorProximidad(results[2].value as CitaResponseEnriquecida[]));
      }

      if (results[3].status === 'fulfilled') {
        setMedicos(results[3].value as MedicoResumen[]);
      }

      if (results[4].status === 'fulfilled') {
        const pacientesData = results[4].value as { items: PacienteResponse[] };
        setPacientes(pacientesData.items);
      }

      if (isDoctor && results[5]?.status === 'fulfilled') {
        setTriajeResumen(results[5].value as TriajeResumen);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo cargar el resumen del dashboard. Verifica que el backend esté activo.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const expedienteId = params.get('expediente');
    if (expedienteId) {
      setExpedientePacienteId(Number(expedienteId));
      setShowExpedienteModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  const showToastMsg = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const closeCitaModal = () => setActiveModal(null);

  const { handleCreate, handleUpdate, handleDelete, buildEditForm, buildNewForm } = useCitaActions({
    isSecretary,
    onSuccess: (msg) => showToastMsg(msg, 'success'),
    onError: (msg) => showToastMsg(msg, 'error'),
    onRefresh: () => loadData(false),
    onCloseModal: closeCitaModal,
    onCreated: (pacienteId) => setPacientesSinCitaList((prev) => prev.filter((p) => p.id !== pacienteId)),
  });

  // ==================== CONTROL DEL CALENDARIO ====================

  const getWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0: Dom, 1: Lun, ...
    
    // Calcular lunes de la semana actual
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      week.push(dayDate);
    }
    return week;
  };

  const weekDays = getWeekDays();

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // ==================== HANDLERS PACIENTES ====================

  const handleQuickPatientChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuickPatient(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }));
  };

  const handleRegisterPatient = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quickPatient.dni || !quickPatient.nombre || !quickPatient.apellidos || !quickPatient.fecha_nacimiento) {
      showToastMsg('Por favor completa todos los campos requeridos (*)', 'error');
      return;
    }

    setIsRegisteringPatient(true);
    try {
      const response = await createPaciente(quickPatient);
      showToastMsg(`Paciente ${response.nombre} ${response.apellidos} registrada exitosamente`, 'success');
      
      // Limpiar formulario
      setQuickPatient({
        dni: '',
        nombre: '',
        apellidos: '',
        fecha_nacimiento: '',
        telefono_principal: '',
        email: '',
        medico_asignado_id: undefined
      });

      // Recargar datos en segundo plano (para actualizar KPIs y el listado de pacientes)
      await loadData(false);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Error al registrar la paciente. Revisa los datos o el DNI.';
      showToastMsg(msg, 'error');
    } finally {
      setIsRegisteringPatient(false);
    }
  };

  // ==================== HANDLERS CREAR CITA ====================

  const handleOpenCreateModal = (patientId?: number) => {
    const form = buildNewForm();
    setNewCita({
      ...form,
      paciente_id: patientId ? String(patientId) : '',
    });
    setPreselectedPatientId(patientId || null);
    setActiveModal('create');
  };

  // ==================== HANDLERS EDITAR CITA ====================

  const handleOpenEditModal = (cita: CitaResponseEnriquecida) => {
    setSelectedCitaId(cita.id);
    setSelectedCitaDetail(cita);
    setEditCitaForm(buildEditForm(cita));
    setActiveModal('edit');
  };

  // ==================== HANDLERS DETALLE CITA ====================

  const handleOpenDetailModal = async (citaId: number) => {
    setSelectedCitaId(citaId);
    setSelectedPatientPerfil(null);
    setActiveModal('detail');
    setIsLoadingPerfil(true);
    
    try {
      const cita = await getCitaById(citaId);
      setSelectedCitaDetail(cita);
      
      // Intentar cargar perfil de paciente adicional para el historial completo
      try {
        const perfilResponse = await api.get<PacientePerfilResponse>(`/api/pacientes/${cita.paciente_id}/perfil`);
        setSelectedPatientPerfil(perfilResponse.data);
      } catch (err) {
        console.warn('No se pudo cargar el perfil detallado del paciente:', err);
      }
    } catch (err) {
      console.error(err);
      showToastMsg('No se pudo obtener el detalle de la cita', 'error');
      setActiveModal(null);
    } finally {
      setIsLoadingPerfil(false);
    }
  };

  const handleIniciarConsulta = async () => {
    if (!selectedCitaId || !selectedCitaDetail) return;
    try {
      await changeCitaEstado(selectedCitaId, 'en_atencion');
      showToastMsg('Consulta iniciada. El estado de la cita ha cambiado a "En atención"', 'success');

      const updatedCita = { ...selectedCitaDetail, estado: 'en_atencion' as const };
      setSelectedCitaDetail(updatedCita);
      await loadData(false);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'No se pudo cambiar el estado de la cita.';
      showToastMsg(msg, 'error');
    }
  };

  const loadAtenderForm = async (cita: CitaResponseEnriquecida) => {
    setSelectedCitaId(cita.id);
    setSelectedCitaDetail(cita);
    const loaded = await loadAtenderFormForPaciente(cita.paciente_id);
    setAtenderDcForm(loaded.form);
    setDcExists(loaded.dcExists);
    setExistingDc(loaded.existingDc);
  };

  const handleOpenAtender = async (cita: CitaResponseEnriquecida) => {
    await loadAtenderForm(cita);
    setActiveModal('atender');
  };

  const handleAtenderFromDetail = async () => {
    if (!selectedCitaDetail) return;
    let cita = selectedCitaDetail;
    if (cita.estado === 'programada') {
      try {
        await changeCitaEstado(cita.id, 'en_atencion');
        cita = { ...cita, estado: 'en_atencion' };
        setSelectedCitaDetail(cita);
      } catch (err: any) {
        showToastMsg(err.response?.data?.detail || 'No se pudo iniciar la consulta', 'error');
        return;
      }
    }
    await loadAtenderForm(cita);
    setActiveModal('atender');
  };

  const handleAtender = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCitaDetail) return;
    const validationError = validateAtenderForm(atenderDcForm);
    if (validationError) {
      showToastMsg(validationError, 'error');
      return;
    }
    setIsSavingAtender(true);
    try {
      const payload = atenderFormToPayload(atenderDcForm, existingDc);
      if (dcExists) {
        await updateAndAnalizarDatosClinicos(selectedCitaDetail.paciente_id, payload);
      } else {
        await createAndAnalizarDatosClinicos(selectedCitaDetail.paciente_id, payload);
        setDcExists(true);
      }
      await changeCitaEstado(selectedCitaDetail.id, 'cumplida');
      showToastMsg('Cita atendida — predicción, triaje y recomendaciones generados', 'success');
      setActiveModal(null);
      setSelectedCitaDetail(null);
      setSelectedCitaId(null);
      await loadData(false);
      setExpedientePacienteId(selectedCitaDetail.paciente_id);
      setShowExpedienteModal(true);
    } catch (err: any) {
      console.error(err);
      showToastMsg(err?.response?.data?.detail || 'Error al atender la cita', 'error');
    } finally {
      setIsSavingAtender(false);
    }
  };

  // ==================== HANDLERS ELIMINAR CITA ====================

  const handleOpenDeleteModal = (citaId: number) => {
    setSelectedCitaId(citaId);
    setActiveModal('delete');
  };

  // ==================== PACIENTES SIN CITA MODAL ====================

  const [isLoadingSinCita, setIsLoadingSinCita] = useState<boolean>(false);

  const handleOpenPatientsWithoutAppointment = () => {
    setActiveModal('patientsWithoutAppointment');
    setPacientesSinCitaList(pacientesSinCita);
  };

  // ==================== FUNCIONES AUXILIARES DE DISEÑO ====================

  const getRiskBadgeStyles = (risk: string | null | undefined) => {
    const normalized = (risk || '').toLowerCase().trim();
    switch (normalized) {
      case 'bajo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'medio':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'alto':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'critico':
      case 'crítico':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'programada':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'en_atencion':
        return 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse';
      case 'cumplida':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelada':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'programada': return 'Programada';
      case 'en_atencion': return 'En Atención';
      case 'cumplida': return 'Cumplida';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  const formatHour = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  const formatFullDate = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  // ==================== RENDERIZADO PRINCIPAL ====================

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/10 min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-8 animate-spin" style={{ borderTopColor: '#612853' }}></div>
          <p className="text-gray-500 font-medium">Cargando datos del SAT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* TOAST SYSTEM */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 animate-slide-in"
             style={{ 
               backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
               color: toast.type === 'success' ? '#065F46' : '#991B1B',
               borderColor: toast.type === 'success' ? '#A7F3D0' : '#FCA5A5'
             }}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ERROR SCREEN */}
      {errorMsg && (
        <div className="p-4 rounded-xl text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ backgroundColor: '#BA1A1A' }}>
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold">Error de Conexión</h3>
              <p className="text-sm opacity-90">{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => loadData(true)} className="px-4 py-2 bg-white text-rose-900 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors self-start sm:self-center">
            Reintentar
          </button>
        </div>
      )}

      {/* TITULO Y FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {isDoctor ? 'Panel Médico' : isAdmin ? 'Panel Administrativo' : 'Panel de Control Obstétrico'}
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            {isDoctor
              ? 'Citas pendientes de atención y alertas de riesgo prenatal.'
              : isAdmin
                ? 'Métricas del sistema, citas y evolución del riesgo prenatal.'
                : 'Gestión de citas y monitoreo de alertas de parto prematuro en tiempo real.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(isDoctor || isAdmin) && (
            <button
              onClick={() => setShowExpedienteModal(true)}
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-white shadow-md shadow-fuchsia-950/10 hover:opacity-95 active:scale-95 transition-all duration-150"
              style={{ backgroundColor: '#612853' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Expediente Inteligente</span>
            </button>
          )}
          {!isDoctor && (
          <button 
            onClick={() => handleOpenCreateModal()}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-white shadow-md shadow-fuchsia-950/10 hover:opacity-95 active:scale-95 transition-all duration-150"
            style={{ backgroundColor: '#612853' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Agendar Nueva Cita</span>
          </button>
          )}
        </div>
      </div>

      {/* FILA DE TARJETAS KPI (4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI: Total Pacientes */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pacientes</span>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{resumen?.total_pacientes ?? 0}</h3>
            <span className="text-[10px] text-gray-400 font-medium block mt-2">Registradas en el SAT</span>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 text-gray-600 border border-gray-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* KPI: Citas de Hoy */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Citas Hoy</span>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{resumen?.citas_hoy ?? 0}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-2">● En desarrollo hoy</span>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-sky-50 text-sky-600 border border-sky-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* KPI: Citas de la Semana */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Citas de la Semana</span>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{resumen?.citas_semana ?? 0}</h3>
            <span className="text-[10px] text-gray-400 font-medium block mt-2">Semana epidemiológica</span>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        </div>

        {/* KPI: Pacientes sin Cita / Críticos Triaje (médico) */}
        {isDoctor ? (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Críticos (Triaje)</span>
                <h3 className="text-3xl font-extrabold text-red-600 mt-1">{triajeResumen?.rojo ?? 0}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50 text-red-600 border border-red-100">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <Link to="/triaje"
              className="w-full mt-3 py-2 px-3 text-center text-xs font-bold rounded-lg border transition-all duration-150 hover:bg-red-50 focus:outline-none block"
              style={{ borderColor: '#DC2626', color: '#DC2626' }}>
              Ver triaje completo
            </Link>
          </div>
        ) : (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pacientes sin Cita</span>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{pacientesSinCita.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <button 
            onClick={handleOpenPatientsWithoutAppointment}
            className="w-full mt-3 py-2 px-3 text-center text-xs font-bold rounded-lg border transition-all duration-150 hover:bg-gray-50 focus:outline-none"
            style={{ borderColor: '#612853', color: '#612853' }}
          >
            Ver pacientes sin cita
          </button>
        </div>
        )}

      </div>

      <OperativoDashboardPanel />

      {isAdmin && (
        <AdminAnalyticsPanel />
      )}

      {/* DISPOSICIÓN DE DOS COLUMNAS (70% - 30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (70%): TABLA DE CITAS DE HOY */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Agenda de Hoy</h2>
              <p className="text-xs text-gray-500">Citas programadas para el día de hoy ordenadas cronológicamente.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 py-1.5 px-3 rounded-lg self-start sm:self-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Hoy: {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {citasHoy.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-100 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-700">No hay citas programadas</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-xs">No se encontraron citas médicas programadas para la fecha de hoy.</p>
                {!isDoctor && (
                <button 
                  onClick={() => handleOpenCreateModal()}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-lg hover:opacity-90"
                  style={{ backgroundColor: '#612853' }}
                >
                  Programar primera cita
                </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Fecha</th>
                    <th className="py-3.5 px-4">Hora</th>
                    <th className="py-3.5 px-4">Paciente</th>
                    <th className="py-3.5 px-4">Médico</th>
                    <th className="py-3.5 px-4">Duración</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {citasHoy.map((cita) => (
                    <tr key={cita.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">
                        {new Date(cita.fecha_hora).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {formatHour(cita.fecha_hora)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 leading-tight">
                          {cita.paciente_nombre || 'Paciente no identificada'}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">DNI {cita.paciente_dni ?? '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                        {cita.medico_nombre ? `Dr. ${cita.medico_nombre.split(' ')[0]}` : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {cita.duracion_minutos} min
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyles(cita.estado)}`}>
                          {getStatusLabel(cita.estado)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(cita.id)}
                            title="Ver detalle"
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {isDoctor ? (
                            (cita.estado === 'programada' || cita.estado === 'en_atencion') ? (
                              <button
                                onClick={() => handleOpenAtender(cita)}
                                title="Atender cita y registrar datos clínicos"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                                style={{ backgroundColor: '#F5EDF2', color: '#612853', borderColor: '#E8D5EF' }}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Atender</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic px-2">
                                {cita.estado === 'cumplida' ? 'Atendida' : 'Cancelada'}
                              </span>
                            )
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(cita)}
                                title="Editar cita"
                                disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(cita.id)}
                                title="Cancelar cita"
                                disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (30%): CALENDARIO + REGISTRO RÁPIDO */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* CALENDARIO SEMANAL */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Calendario Semanal</h2>
              <p className="text-[10px] text-gray-500">Distribución de citas en la semana actual.</p>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {weekDays.map((dayDate, idx) => {
                const isToday = isSameDay(dayDate, new Date());
                const dayNum = dayDate.getDate();
                const dayLabel = dayDate.toLocaleDateString('es-ES', { weekday: 'narrow' });
                
                // Buscar si hay citas hoy en el calendario
                // Dado que citasHoy es solo para hoy, solo mostramos el conteo preciso para el día de hoy
                const countTodayCitas = isToday ? citasHoy.filter(c => c.estado !== 'cancelada').length : 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{dayLabel}</span>
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border ${
                        isToday 
                          ? 'text-white border-transparent shadow-sm' 
                          : 'text-gray-700 bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      style={isToday ? { backgroundColor: '#612853' } : {}}
                    >
                      {dayNum}
                    </div>
                    {/* Conteo de citas */}
                    <div className="h-1.5">
                      {isToday && countTodayCitas > 0 ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 p-2.5 rounded-xl flex items-center justify-between">
              <span>Hoy programadas:</span>
              <span className="font-bold text-gray-950">{citasHoy.filter(c => c.estado !== 'cancelada').length} citas</span>
            </div>
          </div>

          {/* REGISTRO RÁPIDO (secretaria) / ALERTAS MÉDICO */}
          {isDoctor ? (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Resumen de Alertas</h2>
                <p className="text-[10px] text-gray-500">Pacientes priorizados por nivel de urgencia.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Crítico', count: triajeResumen?.rojo ?? 0, color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Alto', count: triajeResumen?.naranja ?? 0, color: '#EA580C', bg: '#FFF7ED' },
                  { label: 'Moderado', count: triajeResumen?.amarillo ?? 0, color: '#CA8A04', bg: '#FEFCE8' },
                  { label: 'Bajo', count: triajeResumen?.verde ?? 0, color: '#16A34A', bg: '#F0FDF4' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-3 border border-gray-100" style={{ backgroundColor: item.bg }}>
                    <p className="text-[10px] font-bold uppercase" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-2xl font-extrabold" style={{ color: item.color }}>{item.count}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Citas por atender hoy</p>
                {citasHoy.filter(c => c.estado === 'programada' || c.estado === 'en_atencion').length === 0 ? (
                  <p className="text-xs text-gray-400">Sin citas pendientes de atención.</p>
                ) : (
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {citasHoy.filter(c => c.estado === 'programada' || c.estado === 'en_atencion').map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(c.id)}
                          className="w-full flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 border border-gray-100 hover:bg-slate-100 transition-colors text-left"
                        >
                          <span className="font-semibold text-gray-800 truncate">{c.paciente_nombre}</span>
                          <span className="text-gray-400 font-mono ml-2 flex-shrink-0">{formatHour(c.fecha_hora)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link to="/triaje"
                className="w-full py-2.5 px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 text-center block"
                style={{ backgroundColor: '#612853' }}>
                Ir a Triaje
              </Link>
            </div>
          ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Gestión de Pacientes</h2>
            <button
                onClick={() => setActiveModal('registerPatient')}
                className="w-full py-2.5 px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all duration-150"
                style={{ backgroundColor: '#612853' }}
              >
                Registrar Nueva Gestante
              </button>
          </div>
          )}

        </div>

      </div>

      {/* ==================== MODAL: REGISTRAR PACIENTE ==================== */}
      {activeModal === 'registerPatient' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gray-900">Registrar Nueva Gestante</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleRegisterPatient} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">DNI *</label>
                <input type="text" name="dni" required value={quickPatient.dni} onChange={handleQuickPatientChange} placeholder="Número de identidad" className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fuchsia-900 focus:border-fuchsia-900 bg-gray-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombres *</label>
                <input type="text" name="nombre" required value={quickPatient.nombre} onChange={handleQuickPatientChange} placeholder="Nombre de la paciente" className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fuchsia-900 focus:border-fuchsia-900 bg-gray-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Apellidos *</label>
                <input type="text" name="apellidos" required value={quickPatient.apellidos} onChange={handleQuickPatientChange} placeholder="Apellidos completos" className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fuchsia-900 focus:border-fuchsia-900 bg-gray-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Fecha de Nacimiento *</label>
                <input type="date" name="fecha_nacimiento" required value={quickPatient.fecha_nacimiento} onChange={handleQuickPatientChange} className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fuchsia-900 focus:border-fuchsia-900 bg-gray-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono Principal</label>
                <input type="text" name="telefono_principal" value={quickPatient.telefono_principal || ''} onChange={handleQuickPatientChange} placeholder="Celular" className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fuchsia-900 focus:border-fuchsia-900 bg-gray-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Obstetra Asignado</label>
                <select name="medico_asignado_id" value={quickPatient.medico_asignado_id || ''} onChange={handleQuickPatientChange} className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fuchsia-900 focus:border-fuchsia-900 bg-gray-50/50 text-gray-700">
                  <option value="">Seleccionar Médico</option>
                  {medicos.map(m => (
                    <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={isRegisteringPatient} className="w-full mt-2 py-2.5 px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all duration-150" style={{ backgroundColor: '#612853' }}>
                {isRegisteringPatient ? 'Registrando...' : 'Registrar Gestante'}
              </button>
            </form>
          </div>
        </div>
      )}
      {activeModal === 'create' && (
        <CreateCitaModal
          form={newCita}
          medicos={medicos}
          isSecretary={isSecretary}
          isSaving={isCreatingCita}
          onClose={closeCitaModal}
          onChange={setNewCita}
          onSubmit={(e) => handleCreate(e, newCita, setIsCreatingCita)}
        />
      )}

      {activeModal === 'edit' && selectedCitaDetail && (
        <EditCitaModal
          cita={selectedCitaDetail}
          form={editCitaForm}
          medicos={medicos}
          isSaving={isUpdatingCita}
          showAgendaActions={isSecretary}
          onClose={closeCitaModal}
          onChange={setEditCitaForm}
          onSubmit={(e) => selectedCitaId && handleUpdate(e, selectedCitaId, editCitaForm, setIsUpdatingCita)}
          onActionDone={(msg) => { showToastMsg(msg, 'success'); loadData(false); }}
        />
      )}

      {activeModal === 'delete' && selectedCitaId && (
        <DeleteCitaModal onClose={closeCitaModal} onConfirm={() => handleDelete(selectedCitaId)} />
      )}

      {/* ==================== MODAL: DETALLE CITA Y HISTORIAL CLÍNICO ==================== */}
      {activeModal === 'detail' && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-zoom-in"
            onClick={e => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#612853' }}>
              <div className="text-white">
                <h3 className="font-extrabold text-lg">Detalle de la Cita Médica</h3>
                <p className="text-xs text-fuchsia-200">ID de Cita: #{selectedCitaDetail?.id}</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-fuchsia-200 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isLoadingPerfil ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-8 animate-spin" style={{ borderTopColor: '#612853' }}></div>
                <p className="text-gray-500 text-sm font-medium">Obteniendo expediente clínico del SAT...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                
                {/* Bloque superior: Paciente y Estado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-gray-700 bg-white border border-gray-200 shadow-xs">
                      {selectedCitaDetail?.paciente_nombre?.substring(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-950 text-base">{selectedCitaDetail?.paciente_nombre}</h4>
                      <p className="text-xs text-gray-500 font-medium">DNI: {selectedCitaDetail?.paciente_dni ?? '—'} | Edad Gestacional: <span className="font-semibold text-gray-800">{selectedCitaDetail?.semanas_gestacion ?? '--'} semanas</span></p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${getRiskBadgeStyles(selectedCitaDetail?.nivel_riesgo)}`}>
                      Riesgo: {selectedCitaDetail?.nivel_riesgo || 'Bajo'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${getStatusBadgeStyles(selectedCitaDetail?.estado || 'programada')}`}>
                      {getStatusLabel(selectedCitaDetail?.estado || 'programada')}
                    </span>
                  </div>
                </div>

                {/* Grid 2 Columnas de metadatos de la cita */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Fecha y Hora */}
                  <div className="border border-gray-100 p-3.5 rounded-xl bg-white shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha y Hora</span>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{selectedCitaDetail ? formatFullDate(selectedCitaDetail.fecha_hora) : ''}</span>
                    </p>
                  </div>

                  {/* Obstetra Asignado */}
                  <div className="border border-gray-100 p-3.5 rounded-xl bg-white shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Obstetra Asignado</span>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Dr. {selectedCitaDetail?.medico_nombre}</span>
                    </p>
                  </div>

                  {/* Duración */}
                  <div className="border border-gray-100 p-3.5 rounded-xl bg-white shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duración Estimada</span>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedCitaDetail?.duracion_minutos} minutos
                    </p>
                  </div>

                </div>

                {/* Notas Clínicas */}
                {selectedCitaDetail?.notas && (
                  <div className="border border-gray-100 p-4 rounded-xl bg-amber-50/20 border-l-4 border-l-amber-500">
                    <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">Comentarios de Derivación</span>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">{selectedCitaDetail.notas}</p>
                  </div>
                )}

                {/* Sub-panel: Historial Clínico Completo (SAT prediction metrics) */}
                {selectedPatientPerfil && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                      <span className="w-1.5 h-4 bg-fuchsia-900 rounded-full"></span>
                      <h4 className="text-sm font-extrabold text-gray-950 uppercase tracking-wide">Expediente Clínico y Alerta del SAT</h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      
                      {/* Edad de la madre */}
                      <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">Edad Madre</span>
                        <span className="text-xs font-bold text-gray-900">{selectedPatientPerfil.edad_madre ?? '--'} años</span>
                      </div>

                      {/* Longitud Cervical */}
                      <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">Long. Cervical</span>
                        <span className={`text-xs font-bold ${selectedPatientPerfil.longitud_cervical_mm && selectedPatientPerfil.longitud_cervical_mm < 25 ? 'text-red-600' : 'text-gray-900'}`}>
                          {selectedPatientPerfil.longitud_cervical_mm ?? '--'} mm
                        </span>
                      </div>

                      {/* IMC (BMI) */}
                      <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">IMC / BMI</span>
                        <span className="text-xs font-bold text-gray-900">{selectedPatientPerfil.bmi ?? '--'}</span>
                      </div>

                      {/* Nivel Urgencia */}
                      <div className="bg-gray-55/40 p-2.5 rounded-xl border border-gray-100 text-center">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">SAT Urgencia</span>
                        <span className={`text-xs font-extrabold ${selectedPatientPerfil.nivel_urgencia === 'rojo' ? 'text-rose-600' : 'text-gray-900'}`}>
                          {(selectedPatientPerfil.nivel_urgencia || 'bajo').toUpperCase()}
                        </span>
                      </div>

                    </div>

                    {/* Checkboxes de condiciones médicas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                      
                      <div className="flex items-center gap-2 font-semibold">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] text-white ${(selectedPatientPerfil.embarazo_multiple ?? 1) > 1 ? 'bg-fuchsia-900' : 'bg-gray-200'}`}>
                          {(selectedPatientPerfil.embarazo_multiple ?? 1) > 1 ? '✓' : ''}
                        </span>
                        <span className={(selectedPatientPerfil.embarazo_multiple ?? 1) > 1 ? 'text-gray-900' : 'text-gray-400'}>Embarazo Múltiple</span>
                      </div>

                      <div className="flex items-center gap-2 font-semibold">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] text-white ${selectedPatientPerfil.parto_prematuro_previo ? 'bg-fuchsia-900' : 'bg-gray-200'}`}>
                          {selectedPatientPerfil.parto_prematuro_previo ? '✓' : ''}
                        </span>
                        <span className={selectedPatientPerfil.parto_prematuro_previo ? 'text-gray-900' : 'text-gray-400'}>Parto Prematuro Previo</span>
                      </div>

                      <div className="flex items-center gap-2 font-semibold">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] text-white ${selectedPatientPerfil.hipertension_gestacional ? 'bg-fuchsia-900' : 'bg-gray-200'}`}>
                          {selectedPatientPerfil.hipertension_gestacional ? '✓' : ''}
                        </span>
                        <span className={selectedPatientPerfil.hipertension_gestacional ? 'text-gray-900' : 'text-gray-400'}>Hipertensión Gestacional</span>
                      </div>

                      <div className="flex items-center gap-2 font-semibold">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] text-white ${selectedPatientPerfil.infeccion_activa ? 'bg-fuchsia-900' : 'bg-gray-200'}`}>
                          {selectedPatientPerfil.infeccion_activa ? '✓' : ''}
                        </span>
                        <span className={selectedPatientPerfil.infeccion_activa ? 'text-gray-900' : 'text-gray-400'}>Infección Activa</span>
                      </div>

                    </div>

                    {/* Probabilidad e Interpretación de Alerta SAT */}
                    {selectedPatientPerfil.prob_consenso != null && (
                      <div className="p-3 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700">Probabilidad de Parto Prematuro (ML):</span>
                        <span className="font-extrabold text-fuchsia-900 text-sm">{(Number(selectedPatientPerfil.prob_consenso) * 100).toFixed(1)}%</span>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer del Modal: Acciones de Consulta */}
                <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">

                  {isDoctor ? (
                    (selectedCitaDetail?.estado === 'programada' || selectedCitaDetail?.estado === 'en_atencion') ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {selectedCitaDetail?.estado === 'programada' && (
                          <button
                            onClick={handleIniciarConsulta}
                            className="py-2.5 px-5 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2"
                          >
                            Iniciar consulta
                          </button>
                        )}
                        <button
                          onClick={handleAtenderFromDetail}
                          className="py-2.5 px-6 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2 hover:opacity-90 shadow-sm active:scale-95 transition-all duration-150"
                          style={{ backgroundColor: '#612853' }}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Atender y registrar datos clínicos</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-bold flex items-center gap-1">
                        <span>✓ Esta cita médica ya concluyó</span>
                      </div>
                    )
                  ) : (
                    <>
                      {selectedCitaDetail?.estado === 'programada' ? (
                        <button
                          onClick={handleIniciarConsulta}
                          className="py-2.5 px-6 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2 hover:opacity-90 shadow-sm active:scale-95 transition-all duration-150"
                          style={{ backgroundColor: '#612853' }}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Iniciar Consulta Médica</span>
                        </button>
                      ) : selectedCitaDetail?.estado === 'en_atencion' ? (
                        <div className="text-xs text-purple-700 font-bold flex items-center gap-1">
                          <span>Consulta en curso</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 font-bold flex items-center gap-1">
                          <span>✓ Esta cita médica ya concluyó</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-2 justify-end">
                    {selectedCitaDetail && (
                      <button
                        onClick={() => navigate(`/pacientes/${selectedCitaDetail.paciente_id}`, { state: { initialTab: 'clinico' } })}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-150 border border-gray-200 bg-white"
                      >
                        Ver expediente completo
                      </button>
                    )}
                    <button
                      onClick={() => setActiveModal(null)}
                      className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      Cerrar
                    </button>
                  </div>

                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ==================== MODAL: ATENDER CITA (MÉDICO) ==================== */}
      {activeModal === 'atender' && selectedCitaDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
             onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
                  <svg className="w-5 h-5" style={{ color: '#612853' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Atender Cita</h2>
                  <p className="text-xs text-gray-500">
                    {selectedCitaDetail.paciente_nombre} · {formatHour(selectedCitaDetail.fecha_hora)}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mx-6 mt-5 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Registra o actualiza los datos clínicos de la paciente. Al guardar, la cita quedará marcada automáticamente como <strong>Atendida</strong>.
              </p>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form onSubmit={handleAtender}>
                <DcAtenderFormView
                  form={atenderDcForm}
                  onChange={setAtenderDcForm}
                />
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50"
                    style={{ borderColor: '#E8D5EF' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSavingAtender}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                    style={{ backgroundColor: '#612853' }}>
                    {isSavingAtender ? 'Guardando...' : 'Guardar datos y marcar como Atendida'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EXPEDIENTE INTELIGENTE ==================== */}
      {showExpedienteModal && (
        <ExpedienteInteligenteModal
          pacienteId={expedientePacienteId}
          onClose={() => { setShowExpedienteModal(false); setExpedientePacienteId(null); }}
        />
      )}

      {/* ==================== MODAL: PACIENTES SIN CITA ==================== */}
      {activeModal === 'patientsWithoutAppointment' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#612853' }}>
              <div className="text-white">
                <h3 className="font-extrabold text-lg">Pacientes sin Cita Programada</h3>
                <p className="text-xs text-fuchsia-200">Listado de gestantes que requieren programar un control clínico.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-fuchsia-200 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              {isLoadingSinCita ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-8 animate-spin" style={{ borderTopColor: '#612853' }}></div>
                  <p className="text-gray-400 text-xs">Cargando gestantes...</p>
                </div>
              ) : pacientesSinCitaList.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">Todas las pacientes tienen citas programadas.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pacientesSinCitaList.map(patient => (
                    <div key={patient.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{patient.nombre} {patient.apellidos}</h4>
                        <p className="text-[10px] text-gray-500 font-medium">DNI {patient.dni} | Teléfono: {patient.telefono_principal || 'No registrado'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveModal(null);
                          handleOpenCreateModal(patient.id);
                        }}
                        className="py-1.5 px-3 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#612853' }}
                      >
                        Agendar Cita
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 border"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
