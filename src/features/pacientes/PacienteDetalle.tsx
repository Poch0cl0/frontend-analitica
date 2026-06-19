import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNav } from '../../contexts/NavContext';
import {
  getPacienteById,
  updatePaciente,
  getMedicos,
  getCitas,
  createCita,
  updateCita,
  deleteCita,
} from '../../services/api';
import type {
  PacienteResponse,
  MedicoResumen,
  CitaResponseEnriquecida,
  PacienteUpdatePayload,
  CitaCreate,
  CitaUpdate,
} from '../../services/api';

const PRIMARY = '#612853';

function calcEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatHour(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return '--:--'; }
}

function getStatusBadge(estado: string) {
  switch (estado) {
    case 'programada': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'en_atencion': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'cumplida': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelada': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

function getStatusLabel(estado: string) {
  const map: Record<string, string> = { programada: 'Programada', en_atencion: 'En Atención', cumplida: 'Cumplida', cancelada: 'Cancelada' };
  return map[estado] || estado;
}

const TIPO_CITA_OPTIONS = [
  { value: 'Control Prenatal', label: 'Control Prenatal de Rutina' },
  { value: 'Consulta Inicial', label: 'Consulta Inicial / Primera Cita' },
  { value: 'Ecografía Obstétrica', label: 'Ecografía Obstétrica' },
  { value: 'Monitoreo Fetal', label: 'Monitoreo Fetal' },
  { value: 'Urgencia Prenatal', label: 'Control Urgente por Riesgo' },
  { value: 'Consulta Especialidad', label: 'Evaluación de Especialidad (Alto Riesgo)' },
];

// ── CITA MODAL ────────────────────────────────────────────────────────────────
interface CitaFormData {
  fecha: string;
  hora: string;
  medico_id: string;
  motivo: string;
  duracion_minutos: number;
  notas: string;
}

interface CitaModalProps {
  mode: 'create' | 'edit';
  form: CitaFormData;
  pacienteNombre: string;
  medicos: MedicoResumen[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onDuracionChange: (v: number) => void;
}

function CitaModal({ mode, form, pacienteNombre, medicos, isSaving, onClose, onSubmit, onChange, onDuracionChange }: CitaModalProps) {
  const inputCls = "w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white";
  const borderStyle = { borderColor: '#E8D5EF' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
         onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
              <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {mode === 'create' ? 'Nueva Cita Médica' : 'Editar Cita Médica'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
            <span className="text-sm font-bold text-gray-800">Datos de la Cita</span>
          </div>

          {/* Paciente (readonly) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Paciente (no editable)</label>
            <input readOnly value={pacienteNombre} className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} style={borderStyle} />
          </div>

          {/* Médico */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Obstetra Médico *</label>
            <select name="medico_id" required value={form.medico_id} onChange={onChange}
              className={inputCls} style={borderStyle}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}>
              <option value="">Seleccionar médico</option>
              {medicos.map(m => <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>)}
            </select>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha *</label>
              <input type="date" name="fecha" required value={form.fecha} onChange={onChange}
                className={inputCls} style={borderStyle}
                onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Hora *</label>
              <input type="time" name="hora" required value={form.hora} onChange={onChange}
                className={inputCls} style={borderStyle}
                onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
            </div>
          </div>

          {/* Tipo de cita */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de Cita *</label>
            <select name="motivo" value={form.motivo} onChange={onChange}
              className={inputCls} style={borderStyle}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}>
              {TIPO_CITA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Duración */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-500">Duración de la consulta</label>
              <span className="text-xs font-bold" style={{ color: PRIMARY }}>{form.duracion_minutos} min</span>
            </div>
            <input type="range" min="15" max="120" step="15" value={form.duracion_minutos}
              onChange={e => onDuracionChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-current"
              style={{ accentColor: PRIMARY }} />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notas o Comentarios</label>
            <textarea name="notas" rows={3} value={form.notas}
              onChange={onChange as any}
              placeholder="Síntomas iniciales, antecedentes, requerimientos especiales..."
              className={`${inputCls} resize-none`} style={borderStyle}
              onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
              onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E8D5EF' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: PRIMARY }}>
              {isSaving ? 'Guardando...' : mode === 'create' ? 'Agendar Cita' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setNav } = useNav();

  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [citas, setCitas] = useState<CitaResponseEnriquecida[]>([]);
  const [activeTab, setActiveTab] = useState<'personal' | 'citas'>('personal');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Edit patient modal
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '', apellidos: '', dni: '', fecha_nacimiento: '',
    telefono_principal: '', email: '', medico_asignado_id: '',
  });
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Cita modals
  const [citaModal, setCitaModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedCita, setSelectedCita] = useState<CitaResponseEnriquecida | null>(null);
  const [isSavingCita, setIsSavingCita] = useState(false);
  const [citaForm, setCitaForm] = useState<CitaFormData>({
    fecha: '', hora: '', medico_id: '', motivo: 'Control Prenatal', duracion_minutos: 30, notas: '',
  });

  const medicoMap: Record<number, MedicoResumen> = {};
  medicos.forEach(m => { medicoMap[m.id] = m; });

  // ── LOAD ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [pac, med] = await Promise.all([
          getPacienteById(Number(id)),
          getMedicos(),
        ]);
        setPaciente(pac);
        setMedicos(med);
        setNav('Pacientes', [
          { label: 'Principal' },
          { label: 'Pacientes', path: '/pacientes' },
          { label: `${pac.nombre} ${pac.apellidos}` },
        ]);

        // Load all citas and filter by paciente_id client-side
        const allCitas = await getCitas();
        setCitas(allCitas.filter(c => c.paciente_id === pac.id));
      } catch {
        showToast('Error al cargar los datos de la paciente', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    return () => { setNav(null); };
  }, [id]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const reloadCitas = async () => {
    if (!paciente) return;
    const all = await getCitas();
    setCitas(all.filter(c => c.paciente_id === paciente.id));
  };

  // ── EDIT PATIENT ───────────────────────────────────────────────────────────
  const handleOpenEditPatient = () => {
    if (!paciente) return;
    setEditForm({
      nombre: paciente.nombre,
      apellidos: paciente.apellidos,
      dni: paciente.dni,
      fecha_nacimiento: paciente.fecha_nacimiento.split('T')[0],
      telefono_principal: paciente.telefono_principal || '',
      email: paciente.email || '',
      medico_asignado_id: paciente.medico_asignado_id ? String(paciente.medico_asignado_id) : '',
    });
    setShowEditPatient(true);
  };

  const handleSavePatient = async (e: FormEvent) => {
    e.preventDefault();
    if (!paciente) return;
    setIsSavingPatient(true);
    try {
      const payload: PacienteUpdatePayload = {
        nombre: editForm.nombre,
        apellidos: editForm.apellidos,
        fecha_nacimiento: editForm.fecha_nacimiento,
        telefono_principal: editForm.telefono_principal || null,
        email: editForm.email || null,
        medico_asignado_id: editForm.medico_asignado_id ? Number(editForm.medico_asignado_id) : null,
      };
      const updated = await updatePaciente(paciente.id, payload);
      setPaciente(updated);
      setNav('Pacientes', [
        { label: 'Principal' },
        { label: 'Pacientes', path: '/pacientes' },
        { label: `${updated.nombre} ${updated.apellidos}` },
      ]);
      showToast('Datos actualizados correctamente', 'success');
      setShowEditPatient(false);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al actualizar', 'error');
    } finally {
      setIsSavingPatient(false);
    }
  };

  // ── CREATE CITA ────────────────────────────────────────────────────────────
  const handleOpenCreateCita = () => {
    const now = new Date();
    setCitaForm({
      fecha: now.toISOString().split('T')[0],
      hora: `${String(now.getHours() + 1).padStart(2, '0')}:00`,
      medico_id: '',
      motivo: 'Control Prenatal',
      duracion_minutos: 30,
      notas: '',
    });
    setCitaModal('create');
  };

  const handleCreateCita = async (e: FormEvent) => {
    e.preventDefault();
    if (!paciente) return;
    setIsSavingCita(true);
    try {
      const payload: CitaCreate = {
        paciente_id: paciente.id,
        medico_id: Number(citaForm.medico_id),
        fecha_hora: `${citaForm.fecha}T${citaForm.hora}:00`,
        duracion_minutos: citaForm.duracion_minutos,
        motivo: citaForm.motivo,
        notas: citaForm.notas || null,
      };
      await createCita(payload);
      showToast('Cita agendada exitosamente', 'success');
      setCitaModal(null);
      await reloadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al agendar la cita', 'error');
    } finally {
      setIsSavingCita(false);
    }
  };

  // ── EDIT CITA ──────────────────────────────────────────────────────────────
  const handleOpenEditCita = (cita: CitaResponseEnriquecida) => {
    setSelectedCita(cita);
    const dt = new Date(cita.fecha_hora);
    setCitaForm({
      fecha: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
      hora: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
      medico_id: String(cita.medico_id),
      motivo: cita.motivo || 'Control Prenatal',
      duracion_minutos: cita.duracion_minutos,
      notas: cita.notas || '',
    });
    setCitaModal('edit');
  };

  const handleEditCita = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCita) return;
    setIsSavingCita(true);
    try {
      const payload: CitaUpdate = {
        fecha_hora: `${citaForm.fecha}T${citaForm.hora}:00`,
        medico_id: Number(citaForm.medico_id),
        motivo: citaForm.motivo,
        duracion_minutos: citaForm.duracion_minutos,
        notas: citaForm.notas || null,
      };
      await updateCita(selectedCita.id, payload);
      showToast('Cita actualizada correctamente', 'success');
      setCitaModal(null);
      await reloadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al actualizar la cita', 'error');
    } finally {
      setIsSavingCita(false);
    }
  };

  // ── DELETE CITA ────────────────────────────────────────────────────────────
  const handleDeleteCita = async () => {
    if (!selectedCita) return;
    setIsSavingCita(true);
    try {
      await deleteCita(selectedCita.id);
      showToast('Cita cancelada exitosamente', 'success');
      setCitaModal(null);
      await reloadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al cancelar la cita', 'error');
    } finally {
      setIsSavingCita(false);
    }
  };

  // ── LOADING STATE ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-4 animate-spin" style={{ borderTopColor: PRIMARY }} />
        <p className="text-sm text-gray-400 font-medium">Cargando expediente clínico...</p>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen gap-4">
        <p className="text-gray-500 font-medium">Paciente no encontrada.</p>
        <Link to="/pacientes" className="text-sm font-bold text-white py-2 px-5 rounded-xl hover:opacity-90" style={{ backgroundColor: PRIMARY }}>
          Volver a Pacientes
        </Link>
      </div>
    );
  }

  const edad = calcEdad(paciente.fecha_nacimiento);
  const medicoAsignado = paciente.medico_asignado_id ? medicoMap[paciente.medico_asignado_id] : null;

  const citasActivas = citas.filter(c => c.estado === 'programada' || c.estado === 'en_atencion');

  return (
    <div className="flex-1 flex flex-col p-6 bg-slate-50 min-h-screen space-y-5">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── BACK BUTTON ───────────────────────────────────────────────────── */}
      <button onClick={() => navigate('/pacientes')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors self-start">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver a Pacientes
      </button>

      {/* ── PATIENT HEADER CARD ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0 shadow-md"
            style={{ backgroundColor: PRIMARY }}>
            {paciente.nombre.charAt(0)}{paciente.apellidos.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-gray-900">{paciente.nombre} {paciente.apellidos}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                paciente.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {paciente.activo ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
              <span><strong className="text-gray-700 font-semibold">DNI</strong> {paciente.dni}</span>
              <span><strong className="text-gray-700 font-semibold">Edad</strong> {edad} años</span>
              {paciente.telefono_principal && (
                <span><strong className="text-gray-700 font-semibold">Tel.</strong> {paciente.telefono_principal}</span>
              )}
              <span>
                <strong className="text-gray-700 font-semibold">Médico</strong>{' '}
                {medicoAsignado ? `Dr. ${medicoAsignado.nombre} ${medicoAsignado.apellidos}` : <em className="text-gray-400">Sin asignar</em>}
              </span>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleOpenEditPatient}
            className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-sm flex-shrink-0"
            style={{ backgroundColor: PRIMARY }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Actualizar Datos
          </button>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['personal', 'citas'] as const).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === tab ? { color: PRIMARY } : {}}
          >
            {tab === 'personal' ? 'Datos Personales' : `Citas (${citasActivas.length})`}
          </button>
        ))}
      </div>

      {/* ── TAB: DATOS PERSONALES ─────────────────────────────────────────── */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-800">Datos Personales</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Nombre Completo', value: `${paciente.nombre} ${paciente.apellidos}` },
              { label: 'DNI', value: paciente.dni },
              { label: 'Fecha Nacimiento', value: formatDate(paciente.fecha_nacimiento) },
              { label: 'Edad', value: `${edad} años` },
              { label: 'Teléfono', value: paciente.telefono_principal || '—' },
              { label: 'Correo Electrónico', value: paciente.email || '—' },
              { label: 'Médico Asignado', value: medicoAsignado ? `Dr. ${medicoAsignado.nombre} ${medicoAsignado.apellidos}` : 'Sin asignar' },
              { label: 'Estado', value: paciente.activo ? 'Activa' : 'Inactiva' },
              { label: 'Fecha de Registro', value: formatDate(paciente.created_at) },
              { label: 'Última Actualización', value: formatDate(paciente.updated_at) },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-xl border border-gray-100 bg-slate-50/60">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: CITAS ────────────────────────────────────────────────────── */}
      {activeTab === 'citas' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Citas header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-sm font-bold text-gray-800">Historial de Citas</h3>
            </div>
            <button onClick={handleOpenCreateCita}
              className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all"
              style={{ backgroundColor: PRIMARY }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Cita
            </button>
          </div>

          {citas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">Sin citas registradas</p>
              <button onClick={handleOpenCreateCita}
                className="text-xs font-bold py-2 px-4 rounded-lg text-white hover:opacity-90"
                style={{ backgroundColor: PRIMARY }}>
                Agendar primera cita
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Médico</th>
                    <th className="py-3.5 px-4">Tipo de Cita</th>
                    <th className="py-3.5 px-4">Duración</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {citas.map(cita => (
                    <tr key={cita.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-5">
                        <p className="text-sm font-bold text-gray-900">{formatHour(cita.fecha_hora)}</p>
                        <p className="text-[10px] text-gray-400">{new Date(cita.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">
                        {cita.medico_nombre ? `Dr. ${cita.medico_nombre.split(' ')[0]}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">{cita.motivo || 'Control Prenatal'}</td>
                      <td className="py-3.5 px-4 text-sm text-gray-500">{cita.duracion_minutos} min</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(cita.estado)}`}>
                          {getStatusLabel(cita.estado)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Editar */}
                          <button onClick={() => handleOpenEditCita(cita)}
                            disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                            title="Editar cita"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-semibold border border-amber-100 disabled:opacity-30 disabled:pointer-events-none">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Editar</span>
                          </button>
                          {/* Eliminar */}
                          <button onClick={() => { setSelectedCita(cita); setCitaModal('delete'); }}
                            disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                            title="Cancelar cita"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold border border-red-100 disabled:opacity-30 disabled:pointer-events-none">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Edit Patient */}
      {showEditPatient && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
             onClick={() => setShowEditPatient(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F5EDF2' }}>
                  <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-900">Editar Datos del Paciente</h2>
              </div>
              <button onClick={() => setShowEditPatient(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSavePatient} className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2 pl-3" style={{ borderLeft: `3px solid ${PRIMARY}` }}>
                <span className="text-sm font-bold text-gray-800">Datos Personales</span>
              </div>
              {/* Same fields as create */}
              {[
                { name: 'nombre', label: 'Nombres completos *', required: true, type: 'text', placeholder: 'Ej. Ana Lucía' },
                { name: 'apellidos', label: 'Apellidos *', required: true, type: 'text', placeholder: 'Ej. Pérez García' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                  <input type={f.type} name={f.name} required={f.required} placeholder={f.placeholder}
                    value={(editForm as any)[f.name]}
                    onChange={e => setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">DNI (no editable)</label>
                  <input readOnly value={editForm.dni}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border bg-gray-50 text-gray-500 cursor-not-allowed"
                    style={{ borderColor: '#E8D5EF' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de nacimiento</label>
                  <input type="date" name="fecha_nacimiento" value={editForm.fecha_nacimiento}
                    onChange={e => setEditForm(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono principal</label>
                  <input name="telefono_principal" value={editForm.telefono_principal}
                    onChange={e => setEditForm(prev => ({ ...prev, telefono_principal: e.target.value }))}
                    placeholder="999 000 000"
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Correo electrónico</label>
                  <input type="email" name="email" value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="paciente@ejemplo.com"
                    className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all"
                    style={{ borderColor: '#E8D5EF' }}
                    onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                    onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Médico / Obstetra Asignado</label>
                <select name="medico_asignado_id" value={editForm.medico_asignado_id}
                  onChange={e => setEditForm(prev => ({ ...prev, medico_asignado_id: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white"
                  style={{ borderColor: '#E8D5EF' }}
                  onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
                  onBlur={e => e.currentTarget.style.borderColor = '#E8D5EF'}>
                  <option value="">Sin médico asignado</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditPatient(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E8D5EF' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSavingPatient}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: PRIMARY }}>
                  {isSavingPatient ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Cita Create/Edit */}
      {(citaModal === 'create' || citaModal === 'edit') && (
        <CitaModal
          mode={citaModal}
          form={citaForm}
          pacienteNombre={`${paciente.nombre} ${paciente.apellidos}`}
          medicos={medicos}
          isSaving={isSavingCita}
          onClose={() => setCitaModal(null)}
          onSubmit={citaModal === 'create' ? handleCreateCita : handleEditCita}
          onChange={e => setCitaForm(prev => ({ ...prev, [e.target.name]: e.target.value }))}
          onDuracionChange={v => setCitaForm(prev => ({ ...prev, duracion_minutos: v }))}
        />
      )}

      {/* Cita Delete confirmation */}
      {citaModal === 'delete' && selectedCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
             onClick={() => setCitaModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4"
               onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">¿Cancelar esta cita?</h3>
              <p className="text-sm text-gray-500 mt-2">
                Esta acción marcará la cita como <strong>"cancelada"</strong>. Esta operación no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCitaModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                Volver atrás
              </button>
              <button onClick={handleDeleteCita} disabled={isSavingCita}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isSavingCita ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
