import { useState, useEffect, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPacientesFiltered,
  getMedicos,
  getDashboardResumen,
  createPaciente,
  updatePaciente,
  deletePaciente,
  getCitasFuturasPaciente,
} from '../../services/api';
import type {
  PacienteResponse,
  MedicoResumen,
  DashboardResumen,
  PacienteCreate,
  PacienteUpdatePayload,
} from '../../services/api';

import {
  sanitizeDigits,
  validateDni,
  validatePhonePeru,
} from '../../utils/patientValidation';
import { useModalBackdrop } from '../../hooks/useModalBackdrop';
import PatientModal from './components/PatientModal';
import type { PatientForm } from './components/PatientModal';

const PRIMARY = '#612853';
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function calcEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function formatRegistro(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getEstado(p: PacienteResponse): { label: string; dot: string } {
  if (!p.activo) return { label: 'Inactiva', dot: '#94A3B8' };
  if (!p.medico_asignado_id) return { label: 'Sin médico', dot: '#F59E0B' };
  return { label: 'Activa', dot: '#10B981' };
}

const emptyForm: PatientForm = {
  nombre: '', apellidos: '', dni: '', fecha_nacimiento: '',
  telefono_principal: '', email: '',
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PacientesPage() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || '';
  const isDoctor = userRole === 'medico';

  // Data
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [sinMedicoTotal, setSinMedicoTotal] = useState(0);

  // Filters + pagination
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterMedico, setFilterMedico] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // UI
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResponse | null>(null);
  const [citasFuturasDelete, setCitasFuturasDelete] = useState<number | null>(null);
  const [loadingCitasFuturas, setLoadingCitasFuturas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PatientForm>(emptyForm);

  const medicoMap: Record<number, MedicoResumen> = {};
  medicos.forEach(m => { medicoMap[m.id] = m; });
  const closeModal = () => setActiveModal(null);
  const deleteBackdrop = useModalBackdrop(closeModal);

  // ── LOAD DATA ──────────────────────────────────────────────────────────────
  const loadPacientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, sinMedico] = await Promise.all([
        getPacientesFiltered({
          q: search || undefined,
          estado: filterEstado || undefined,
          medico_id: (!isDoctor && filterMedico) ? Number(filterMedico) : undefined,
          mes_registro: filterMes ? Number(filterMes) : undefined,
          page, limit,
        }),
        getPacientesFiltered({ estado: 'sin_medico', limit: 1 }),
      ]);
      setPacientes(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
      setSinMedicoTotal(sinMedico.total);
    } catch {
      showToast('Error al cargar pacientes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, filterEstado, filterMedico, filterMes, page, limit, isDoctor]);

  useEffect(() => {
    const init = async () => {
      try {
        const [med, res] = await Promise.all([getMedicos(), getDashboardResumen()]);
        setMedicos(med);
        setResumen(res);
      } catch { /* silently ignore */ }
    };
    init();
  }, []);

  useEffect(() => { loadPacientes(); }, [loadPacientes]);

  // ── TOAST ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── FORM HANDLER ──────────────────────────────────────────────────────────
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'telefono_principal') {
      setForm(prev => ({ ...prev, telefono_principal: sanitizeDigits(value, 9) }));
      return;
    }
    if (name === 'dni') {
      setForm(prev => ({ ...prev, dni: sanitizeDigits(value, 8) }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setForm(emptyForm);
    setActiveModal('create');
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const dniErr = validateDni(form.dni);
    const phoneErr = validatePhonePeru(form.telefono_principal);
    if (dniErr || phoneErr) {
      showToast(dniErr || phoneErr || 'Datos inválidos', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload: PacienteCreate = {
        nombre: form.nombre,
        apellidos: form.apellidos,
        dni: form.dni,
        fecha_nacimiento: form.fecha_nacimiento,
        telefono_principal: form.telefono_principal || null,
        email: form.email || null,
      };
      await createPaciente(payload);
      showToast(`Paciente ${form.nombre} registrada exitosamente`, 'success');
      setActiveModal(null);
      await loadPacientes();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al registrar paciente', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── EDIT ───────────────────────────────────────────────────────────────────
  const handleOpenEdit = (p: PacienteResponse) => {
    setSelectedPaciente(p);
    setForm({
      nombre: p.nombre,
      apellidos: p.apellidos,
      dni: p.dni,
      fecha_nacimiento: p.fecha_nacimiento.split('T')[0],
      telefono_principal: p.telefono_principal || '',
      email: p.email || '',
    });
    setActiveModal('edit');
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPaciente) return;
    const phoneErr = validatePhonePeru(form.telefono_principal);
    if (phoneErr) {
      showToast(phoneErr, 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload: PacienteUpdatePayload = {
        nombre: form.nombre,
        apellidos: form.apellidos,
        fecha_nacimiento: form.fecha_nacimiento,
        telefono_principal: form.telefono_principal || null,
        email: form.email || null,
      };
      await updatePaciente(selectedPaciente.id, payload);
      showToast('Datos actualizados correctamente', 'success');
      setActiveModal(null);
      await loadPacientes();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al actualizar paciente', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReactivar = async (p: PacienteResponse) => {
    setIsSaving(true);
    try {
      await updatePaciente(p.id, { activo: true });
      showToast('Paciente reactivada correctamente', 'success');
      await loadPacientes();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al reactivar paciente', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const handleOpenDelete = async (p: PacienteResponse) => {
    setSelectedPaciente(p);
    setCitasFuturasDelete(null);
    setActiveModal('delete');
    setLoadingCitasFuturas(true);
    try {
      const total = await getCitasFuturasPaciente(p.id);
      setCitasFuturasDelete(total);
    } catch {
      setCitasFuturasDelete(null);
    } finally {
      setLoadingCitasFuturas(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPaciente) return;
    setIsSaving(true);
    try {
      const { citas_canceladas } = await deletePaciente(selectedPaciente.id);
      const extra = citas_canceladas > 0
        ? ` Se cancelaron ${citas_canceladas} cita(s) programada(s).`
        : '';
      showToast(`Paciente desactivada del sistema.${extra}`, 'success');
      setActiveModal(null);
      setCitasFuturasDelete(null);
      await loadPacientes();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al desactivar paciente', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── KPI helpers ───────────────────────────────────────────────────────────
  const nuevasEstaSemana = pacientes.filter(p => {
    const diff = Date.now() - new Date(p.created_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  // ── PAGINATION ─────────────────────────────────────────────────────────────
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // ── INPUT STYLE ───────────────────────────────────────────────────────────
  const inputCls = "text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:border-gray-400 transition-all";

  return (
    <div className="flex-1 flex flex-col p-6 bg-slate-50 min-h-screen">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* MAIN CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              {isDoctor ? 'Mis Pacientes' : 'Pacientes'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isDoctor
                ? 'Pacientes asignados a tu consulta · ordenados por cita de hoy y próximas citas'
                : 'Gestión de pacientes registradas'}
            </p>
          </div>
          {!isDoctor && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: PRIMARY }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Paciente
            </button>
          )}
        </div>

        {/* ── FILTERS ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-52 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Nombre, apellido o DNI..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Estado */}
          <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}
            className={inputCls}>
            <option value="">Estado: Todos</option>
            <option value="activo">Activas</option>
            <option value="inactivo">Inactivas</option>
            {!isDoctor && <option value="sin_medico">Sin médico</option>}
          </select>

          {/* Médico — solo para secretaria/admin */}
          {!isDoctor && (
            <select value={filterMedico} onChange={e => { setFilterMedico(e.target.value); setPage(1); }}
              className={inputCls}>
              <option value="">Médico Asignado</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
              ))}
            </select>
          )}

          {/* Mes */}
          <select value={filterMes} onChange={e => { setFilterMes(e.target.value); setPage(1); }}
            className={inputCls}>
            <option value="">Mes de Registro</option>
            {MESES.map((mes, i) => <option key={i+1} value={i+1}>{mes}</option>)}
          </select>
        </div>

        {/* ── TABLE ──────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-4 animate-spin" style={{ borderTopColor: PRIMARY }} />
              <p className="text-sm text-gray-400 font-medium">Cargando pacientes...</p>
            </div>
          ) : pacientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {isDoctor ? 'No tienes pacientes asignados aún' : 'No se encontraron pacientes'}
              </p>
              {!isDoctor && (
                <button onClick={handleOpenCreate} className="text-xs font-bold py-2 px-4 rounded-lg text-white hover:opacity-90" style={{ backgroundColor: PRIMARY }}>
                  Registrar primera paciente
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5 w-10">#</th>
                  <th className="py-3.5 px-4">Paciente</th>
                  <th className="py-3.5 px-4">DNI / ID</th>
                  <th className="py-3.5 px-4">Edad</th>
                  <th className="py-3.5 px-4">Registro</th>
                  {!isDoctor && <th className="py-3.5 px-4">Médico</th>}
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pacientes.map((p, idx) => {
                  const est = getEstado(p);
                  const medico = p.medico_asignado_id ? medicoMap[p.medico_asignado_id] : null;
                  const num = (page - 1) * limit + idx + 1;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-5 text-sm text-gray-400 font-medium">{num}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: PRIMARY }}>
                            {p.nombre.charAt(0)}{p.apellidos.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{p.nombre} {p.apellidos}</p>
                            <p className="text-[10px] text-gray-400">{p.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600 font-mono">{p.dni}</td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">{calcEdad(p.fecha_nacimiento)} años</td>
                      <td className="py-3.5 px-4 text-sm text-gray-500">{formatRegistro(p.created_at)}</td>
                      {!isDoctor && (
                        <td className="py-3.5 px-4 text-sm text-gray-600">
                          {medico ? `Dr. ${medico.nombre} ${medico.apellidos}` : <span className="text-gray-400 italic">Pendiente</span>}
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: est.dot }} />
                          <span className="text-gray-700">{est.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver detalle */}
                          <button onClick={() => navigate(`/pacientes/${p.id}`)}
                            title="Ver detalle del paciente"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-semibold border border-blue-100">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="hidden sm:inline">Ver</span>
                          </button>

                          {/* Doctor: ir a datos clínicos */}
                          {isDoctor && (
                            <button
                              onClick={() => navigate(`/pacientes/${p.id}`, { state: { initialTab: 'clinico' } })}
                              title="Actualizar datos clínicos"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors text-xs font-semibold border border-violet-100">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="hidden sm:inline">Datos médicos</span>
                            </button>
                          )}

                          {/* Secretaria: editar datos personales */}
                          {!isDoctor && (
                            <button onClick={() => handleOpenEdit(p)}
                              title="Editar paciente"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-semibold border border-amber-100">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                          )}

                          {/* Secretaria: desactivar / reactivar */}
                          {!isDoctor && p.activo && (
                            <button onClick={() => handleOpenDelete(p)}
                              title="Desactivar paciente"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold border border-red-100">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              <span className="hidden sm:inline">Desactivar</span>
                            </button>
                          )}
                          {!isDoctor && !p.activo && (
                            <button onClick={() => handleReactivar(p)}
                              title="Reactivar paciente"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-xs font-semibold border border-emerald-100">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="hidden sm:inline">Reactivar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── FOOTER: PAGINATION ─────────────────────────────────────────── */}
        {!isLoading && total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3.5 border-t border-gray-100 bg-gray-50/30">
            <span className="text-sm text-slate-500">
              Mostrando {startItem}–{endItem} de <strong className="text-slate-700">{total}</strong> pacientes
            </span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="hidden sm:inline">Ver</span>
                <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="hidden sm:inline">por página</span>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-600 px-2 font-medium">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            {isDoctor ? 'Mis pacientes activas' : 'Nuevas esta semana'}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {isDoctor ? total : nuevasEstaSemana}
            </span>
            {!isDoctor && <span className="text-sm font-bold text-emerald-600 mb-0.5">↑ en esta semana</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Citas pendientes</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{resumen?.citas_pendientes_activas ?? '—'}</span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1">Programadas o en atención</p>
        </div>

        {!isDoctor ? (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sin médico asignado</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold" style={{ color: sinMedicoTotal > 0 ? '#DC2626' : '#1E293B' }}>
                {String(sinMedicoTotal).padStart(2, '0')}
              </span>
            </div>
            {sinMedicoTotal > 0 && (
              <p className="text-xs font-semibold mt-1" style={{ color: '#DC2626' }}>Requiere atención urgente</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Citas hoy</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{resumen?.citas_hoy ?? '—'}</span>
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">Programadas para hoy</p>
          </div>
        )}
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Create / Edit (solo secretaria) */}
      {!isDoctor && (activeModal === 'create' || activeModal === 'edit') && (
        <PatientModal
          mode={activeModal}
          form={form}
          isSaving={isSaving}
          onClose={() => setActiveModal(null)}
          onSubmit={activeModal === 'create' ? handleCreate : handleEdit}
          onChange={handleFormChange}
        />
      )}

      {/* Delete confirmation (solo secretaria) */}
      {!isDoctor && activeModal === 'delete' && selectedPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
             {...deleteBackdrop}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-8 space-y-5"
               onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-xl font-extrabold text-gray-900">¿Desactivar paciente?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>{selectedPaciente.nombre} {selectedPaciente.apellidos}</strong> dejará de aparecer en listados activos
                y no podrá recibir nuevas citas. <strong>No se eliminan sus datos</strong> del expediente; puede reactivarse cuando lo necesite.
              </p>
              {loadingCitasFuturas ? (
                <p className="text-xs text-gray-500">Consultando citas programadas...</p>
              ) : citasFuturasDelete !== null && citasFuturasDelete > 0 ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-left text-sm text-red-800">
                  <p className="font-semibold">Citas que se cancelarán automáticamente: {citasFuturasDelete}</p>
                  <p className="text-xs mt-1 text-red-700">Solo citas futuras en estado programada o en atención.</p>
                </div>
              ) : citasFuturasDelete === 0 ? (
                <p className="text-xs text-gray-500">No tiene citas futuras programadas.</p>
              ) : null}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setActiveModal(null); setCitasFuturasDelete(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={isSaving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isSaving ? 'Desactivando...' : 'Confirmar desactivación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
