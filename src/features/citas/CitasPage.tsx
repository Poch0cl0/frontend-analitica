import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  createCita,
  getCitas,
  getCitaById,
  changeCitaEstado,
  getMedicos,
  createAndAnalizarDatosClinicos,
  updateAndAnalizarDatosClinicos,
  type DatosClinicosResponse,
  type CitaResponseEnriquecida,
  type MedicoResumen,
} from '../../services/api';
import { getApiErrorMessage } from '../../services/client';
import { atenderFormToPayload, emptyAtenderForm, validateAtenderForm, type DcAtenderForm } from '../../components/DatosClinicosAtenderForm';
import { loadAtenderFormForPaciente } from '../../utils/atenderFormLoader';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useUserRole } from '../../hooks/useUserRole';
import { useCitaActions } from '../../hooks/useCitaActions';
import { PRIMARY } from '../../constants/theme';
import CitaDetailModal from './CitaDetailModal';
import AtenderCitaModal from './AtenderCitaModal';
import CreateCitaModal from './components/CreateCitaModal';
import EditCitaModal, { type EditCitaForm } from './components/EditCitaModal';
import DeleteCitaModal from './components/DeleteCitaModal';
import CitasTable from './components/CitasTable';
import CitasFilters from './components/CitasFilters';
import AgendaCalendarView from '../../components/agenda/AgendaCalendarView';
import type { SlotSeleccionado } from './components/AgendaSemanalView';
import AgendarDesdeSlotModal from './components/AgendarDesdeSlotModal';
import CitaSlotAccionesModal from './components/CitaSlotAccionesModal';
import ReprogramarCitaModal from './components/ReprogramarCitaModal';
import AgendaConfigPanel from './components/AgendaConfigPanel';
import type { PacientePerfilResponse } from './types';
import { sortCitasPorProximidad } from '../../utils/citaTime';

type ActiveModal = 'detail' | 'atender' | 'edit' | 'delete' | 'create' | 'slot' | 'slotCita' | 'reprogramar' | null;
type CitasTab = 'lista' | 'agenda' | 'config';

export default function CitasPage() {
  const navigate = useNavigate();
  const { isDoctor, isSecretary } = useUserRole();
  const { toast, showToast } = useToast();

  const [citas, setCitas] = useState<CitaResponseEnriquecida[]>([]);
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedCitaId, setSelectedCitaId] = useState<number | null>(null);
  const [selectedCitaForEdit, setSelectedCitaForEdit] = useState<CitaResponseEnriquecida | null>(null);
  const [selectedCitaDetail, setSelectedCitaDetail] = useState<CitaResponseEnriquecida | null>(null);
  const [selectedPatientPerfil, setSelectedPatientPerfil] = useState<PacientePerfilResponse | null>(null);
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(false);
  const [atenderDcForm, setAtenderDcForm] = useState<DcAtenderForm>(emptyAtenderForm);
  const [existingDc, setExistingDc] = useState<DatosClinicosResponse | null>(null);
  const [dcExists, setDcExists] = useState(false);
  const [isSavingAtender, setIsSavingAtender] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [editCitaForm, setEditCitaForm] = useState<EditCitaForm>({
    fecha: '', hora: '', medico_id: '', estado: 'programada', notas: '', duracion_minutos: 30,
  });
  const [isUpdatingCita, setIsUpdatingCita] = useState(false);
  const [newCita, setNewCita] = useState(() => ({ paciente_id: '', medico_id: '', fecha: '', hora: '', notas: '', duracion_minutos: 30 }));
  const [isCreatingCita, setIsCreatingCita] = useState(false);
  const [activeTab, setActiveTab] = useState<CitasTab>('agenda');
  const [duracionAgenda, setDuracionAgenda] = useState(30);
  const [selectedSlot, setSelectedSlot] = useState<SlotSeleccionado | null>(null);
  const [selectedSlotCita, setSelectedSlotCita] = useState<CitaResponseEnriquecida | null>(null);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [filterMedicoAgenda, setFilterMedicoAgenda] = useState('');
  const [agendaReloadKey, setAgendaReloadKey] = useState(0);

  const closeModal = () => setActiveModal(null);

  const handleIrACitasFecha = useCallback((fecha: string) => {
    setActiveTab('lista');
    setFilterFecha(fecha);
    setFilterEstado('');
    setSearchQuery('');
  }, []);

  const loadCitas = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const requests: Promise<unknown>[] = [
        getCitas(
          filterFecha || undefined,
          undefined,
          filterEstado || undefined,
        ),
        getMedicos(),
      ];
      const results = await Promise.all(requests);
      const data = results[0] as CitaResponseEnriquecida[];
      setCitas(sortCitasPorProximidad(data));
      setMedicos(results[1] as MedicoResumen[]);
    } catch {
      setErrorMsg('Error al cargar las citas.');
    } finally {
      setIsLoading(false);
    }
  }, [filterFecha, filterEstado, isDoctor]);

  useEffect(() => { loadCitas(); }, [loadCitas]);

  const { handleCreate, handleUpdate, handleDelete, buildEditForm, buildNewForm } = useCitaActions({
    isSecretary,
    onSuccess: (msg) => showToast(msg, 'success'),
    onError: (msg) => showToast(msg, 'error'),
    onRefresh: loadCitas,
    onCloseModal: closeModal,
  });

  const citasFiltradas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return citas;
    return citas.filter((c) => {
      const nombre = (c.paciente_nombre || '').toLowerCase();
      const dni = (c.paciente_dni || String(c.paciente_id)).toLowerCase();
      return nombre.includes(q) || dni.includes(q);
    });
  }, [citas, searchQuery]);

  const handleOpenDetailModal = async (citaId: number) => {
    setSelectedCitaId(citaId);
    setSelectedPatientPerfil(null);
    setActiveModal('detail');
    setIsLoadingPerfil(true);
    try {
      const cita = await getCitaById(citaId);
      setSelectedCitaDetail(cita);
      try {
        const perfilResponse = await api.get<PacientePerfilResponse>(`/api/pacientes/${cita.paciente_id}/perfil`);
        setSelectedPatientPerfil(perfilResponse.data);
      } catch { /* perfil opcional */ }
    } catch {
      showToast('No se pudo obtener el detalle de la cita', 'error');
      closeModal();
    } finally {
      setIsLoadingPerfil(false);
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

  const handleIniciarConsulta = async () => {
    if (!selectedCitaId || !selectedCitaDetail) return;
    try {
      await changeCitaEstado(selectedCitaId, 'en_atencion');
      showToast('Consulta iniciada correctamente', 'success');
      const updated = { ...selectedCitaDetail, estado: 'en_atencion' as const };
      setSelectedCitaDetail(updated);
      setCitas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail || 'No se pudo iniciar la consulta', 'error');
    }
  };

  const handleAtenderFromDetail = async () => {
    if (!selectedCitaDetail) return;
    let cita = selectedCitaDetail;
    if (cita.estado === 'programada') {
      try {
        await changeCitaEstado(cita.id, 'en_atencion');
        cita = { ...cita, estado: 'en_atencion' };
        setSelectedCitaDetail(cita);
        setCitas((prev) => prev.map((c) => (c.id === cita.id ? cita : c)));
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        showToast(detail || 'No se pudo iniciar la consulta', 'error');
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
      showToast(validationError, 'error');
      return;
    }
    setIsSavingAtender(true);
    try {
      const payload = atenderFormToPayload(atenderDcForm, existingDc);
      if (dcExists) await updateAndAnalizarDatosClinicos(selectedCitaDetail.paciente_id, payload);
      else await createAndAnalizarDatosClinicos(selectedCitaDetail.paciente_id, payload);
      await changeCitaEstado(selectedCitaDetail.id, 'cumplida');
      showToast('Cita atendida — predicción, triaje y recomendaciones generados', 'success');
      closeModal();
      navigate(`/dashboard?expediente=${selectedCitaDetail.paciente_id}`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail || 'Error al atender la cita', 'error');
    } finally {
      setIsSavingAtender(false);
    }
  };

  const handleSelectOcupado = async (citaId: number) => {
    try {
      const cita = await getCitaById(citaId);
      setSelectedSlotCita(cita);
      setActiveModal('slotCita');
    } catch {
      showToast('No se pudo cargar la cita', 'error');
    }
  };

  const handleSlotBooking = async (payload: {
    paciente_id: number;
    medico_id: number;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    notas: string;
  }) => {
    setIsSavingSlot(true);
    try {
      await createCita({
        paciente_id: payload.paciente_id,
        medico_id: payload.medico_id,
        fecha_hora: `${payload.fecha}T${payload.horaInicio}:00`,
        fecha_hora_fin: `${payload.fecha}T${payload.horaFin}:00`,
        notas: payload.notas || null,
      });
      setSelectedSlot(null);
      setActiveModal(null);
      setActiveTab('agenda');
      setAgendaReloadKey((k) => k + 1);
      showToast('Cita programada. La agenda se actualizó.', 'success');
      try {
        await loadCitas();
      } catch {
        /* la agenda ya se refresca con reloadKey */
      }
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'No se pudo programar la cita'), 'error');
    } finally {
      setIsSavingSlot(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-8 animate-spin" style={{ borderTopColor: PRIMARY }} />
        <p className="text-gray-500 font-medium mt-4">Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{isDoctor ? 'Mis Citas' : 'Gestión de Citas'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDoctor ? 'Consulta el detalle y atiende citas registrando los datos clínicos de la paciente.' : 'Administra el calendario de citas del servicio obstétrico.'}
          </p>
        </div>
        {!isDoctor && (
          <button type="button" onClick={() => { setNewCita(buildNewForm()); setActiveModal('create'); }}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-white shadow-md shadow-fuchsia-950/10 hover:opacity-95 active:scale-95 transition-all duration-150 shrink-0"
            style={{ backgroundColor: PRIMARY }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span>Agendar manualmente</span>
          </button>
        )}
      </div>

      {!isDoctor && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-1">
          {([
            ['agenda', 'Agenda semanal'],
            ['lista', 'Lista de citas'],
            ['config', 'Horarios y feriados'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-colors ${
                activeTab === id
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
              style={activeTab === id ? { backgroundColor: PRIMARY } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {errorMsg && <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">{errorMsg}</div>}

      {!isDoctor && activeTab === 'agenda' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Médico:</label>
            <select value={filterMedicoAgenda} onChange={(e) => setFilterMedicoAgenda(e.target.value)} className="text-xs px-2 py-1.5 border rounded-lg">
              <option value="">Todos</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
              ))}
            </select>
            <label className="text-xs text-gray-500 font-medium ml-2">Duración:</label>
            <select value={duracionAgenda} onChange={(e) => setDuracionAgenda(Number(e.target.value))} className="text-xs px-2 py-1.5 border rounded-lg">
              {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <AgendaCalendarView
            duracionMinutos={duracionAgenda}
            medicoId={filterMedicoAgenda ? Number(filterMedicoAgenda) : null}
            reloadKey={agendaReloadKey}
            onSelectLibre={(slot) => { setSelectedSlot(slot); setActiveModal('slot'); }}
            onSelectOcupado={handleSelectOcupado}
          />
        </div>
      )}

      {!isDoctor && activeTab === 'config' && (
        <AgendaConfigPanel onIrACitas={handleIrACitasFecha} />
      )}

      {(isDoctor || activeTab === 'lista') && (
        <>
      <CitasFilters
        searchQuery={searchQuery} filterFecha={filterFecha} filterEstado={filterEstado}
        onSearchChange={setSearchQuery} onFechaChange={setFilterFecha} onEstadoChange={setFilterEstado}
        onClear={() => { setSearchQuery(''); setFilterFecha(''); setFilterEstado(''); }}
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <CitasTable citas={citasFiltradas} isDoctor={isDoctor}
          onDetail={handleOpenDetailModal} onAtender={handleOpenAtender}
          onEdit={(c) => {
            setSelectedCitaId(c.id);
            setSelectedCitaForEdit(c);
            setEditCitaForm(buildEditForm(c));
            setActiveModal('edit');
          }}
          onDelete={(id) => { setSelectedCitaId(id); setActiveModal('delete'); }}
        />
      </div>
        </>
      )}

      {activeModal === 'slot' && selectedSlot && (
        <AgendarDesdeSlotModal
          slot={selectedSlot}
          isSaving={isSavingSlot}
          onClose={() => { setSelectedSlot(null); setActiveModal(null); }}
          onSubmit={handleSlotBooking}
        />
      )}

      {activeModal === 'slotCita' && selectedSlotCita && (
        <CitaSlotAccionesModal
          cita={selectedSlotCita}
          onClose={() => { setSelectedSlotCita(null); setActiveModal(null); }}
          onUpdated={() => { loadCitas(); setAgendaReloadKey((k) => k + 1); }}
          onReprogramar={(c) => { setSelectedSlotCita(c); setActiveModal('reprogramar'); }}
        />
      )}

      {activeModal === 'reprogramar' && selectedSlotCita && (
        <ReprogramarCitaModal
          cita={selectedSlotCita}
          medicos={medicos}
          onClose={() => setActiveModal('slotCita')}
          onDone={() => { loadCitas(); setAgendaReloadKey((k) => k + 1); }}
        />
      )}

      {activeModal === 'detail' && (
        <CitaDetailModal cita={selectedCitaDetail} perfil={selectedPatientPerfil} isLoading={isLoadingPerfil}
          isDoctor={isDoctor} onClose={closeModal} onIniciarConsulta={handleIniciarConsulta} onAtender={handleAtenderFromDetail}
          onVerExpediente={() => selectedCitaDetail && navigate(`/pacientes/${selectedCitaDetail.paciente_id}`, { state: { initialTab: 'clinico' } })}
        />
      )}

      {activeModal === 'atender' && selectedCitaDetail && (
        <AtenderCitaModal cita={selectedCitaDetail} form={atenderDcForm} hasExistingData={dcExists}
          isSaving={isSavingAtender} onClose={closeModal} onChange={setAtenderDcForm} onSubmit={handleAtender}
        />
      )}

      {activeModal === 'create' && (
        <CreateCitaModal form={newCita} medicos={medicos} isSecretary={isSecretary}
          isSaving={isCreatingCita} onClose={closeModal} onChange={setNewCita}
          onSubmit={(e) => handleCreate(e, newCita, setIsCreatingCita)}
        />
      )}

      {activeModal === 'edit' && selectedCitaForEdit && (
        <EditCitaModal
          cita={selectedCitaForEdit}
          form={editCitaForm}
          medicos={medicos}
          isSaving={isUpdatingCita}
          showAgendaActions={!isDoctor}
          onClose={closeModal}
          onChange={setEditCitaForm}
          onSubmit={(e) => selectedCitaId && handleUpdate(e, selectedCitaId, editCitaForm, setIsUpdatingCita)}
          onActionDone={(msg) => { showToast(msg, 'success'); loadCitas(); }}
        />
      )}

      {activeModal === 'delete' && selectedCitaId && (
        <DeleteCitaModal onClose={closeModal} onConfirm={() => handleDelete(selectedCitaId)} />
      )}
    </div>
  );
}
