import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  getCitas,
  getCitaById,
  updateCita,
  deleteCita,
  changeCitaEstado,
  getMedicos,
  createDatosClinicos,
  updateDatosClinicos,
  type DatosClinicosResponse,
} from '../../services/api';
import type { CitaResponseEnriquecida, MedicoResumen, CitaUpdate } from '../../services/api';
import {
  atenderFormToPayload,
  emptyAtenderForm,
  type DcAtenderForm,
} from '../../components/DatosClinicosAtenderForm';
import { loadAtenderFormForPaciente } from '../../utils/atenderFormLoader';
import CitaDetailModal from './CitaDetailModal';
import AtenderCitaModal from './AtenderCitaModal';
import type { PacientePerfilResponse } from './types';
import {
  formatHour,
  getStatusBadgeStyles,
  getStatusLabel,
} from './citaUiUtils';

const PRIMARY = '#612853';

type ActiveModal = 'detail' | 'atender' | 'edit' | 'delete' | null;

export default function CitasPage() {
  const navigate = useNavigate();
  const isDoctor = localStorage.getItem('user_role') === 'medico';

  const [citas, setCitas] = useState<CitaResponseEnriquecida[]>([]);
  const [medicos, setMedicos] = useState<MedicoResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedCitaId, setSelectedCitaId] = useState<number | null>(null);
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

  const [editCitaForm, setEditCitaForm] = useState({
    fecha: '',
    hora: '',
    medico_id: '',
    estado: 'programada' as CitaResponseEnriquecida['estado'],
    notas: '',
  });
  const [isUpdatingCita, setIsUpdatingCita] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCitas = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [data, meds] = await Promise.all([
        getCitas(filterFecha || undefined, undefined, filterEstado || undefined),
        getMedicos(),
      ]);
      setCitas(data.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()));
      setMedicos(meds);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al cargar las citas.');
    } finally {
      setIsLoading(false);
    }
  }, [filterFecha, filterEstado]);

  useEffect(() => {
    loadCitas();
  }, [loadCitas]);

  const citasFiltradas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return citas;
    return citas.filter(c => {
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
      } catch (err) {
        console.warn('No se pudo cargar el perfil del paciente:', err);
      }
    } catch (err) {
      console.error(err);
      showToast('No se pudo obtener el detalle de la cita', 'error');
      setActiveModal(null);
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
      setCitas(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'No se pudo iniciar la consulta', 'error');
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
        setCitas(prev => prev.map(c => c.id === cita.id ? cita : c));
      } catch (err: any) {
        showToast(err?.response?.data?.detail || 'No se pudo iniciar la consulta', 'error');
        return;
      }
    }
    await loadAtenderForm(cita);
    setActiveModal('atender');
  };

  const handleAtender = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCitaDetail) return;
    setIsSavingAtender(true);
    try {
      const payload = atenderFormToPayload(atenderDcForm, existingDc);
      if (dcExists) {
        await updateDatosClinicos(selectedCitaDetail.paciente_id, payload);
      } else {
        await createDatosClinicos(selectedCitaDetail.paciente_id, payload);
        setDcExists(true);
      }
      await changeCitaEstado(selectedCitaDetail.id, 'cumplida');
      showToast(
        dcExists
          ? 'Datos clínicos actualizados y cita marcada como atendida'
          : 'Cita atendida y datos clínicos guardados correctamente',
        'success',
      );
      setActiveModal(null);
      setSelectedCitaDetail(null);
      setSelectedCitaId(null);
      await loadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al atender la cita', 'error');
    } finally {
      setIsSavingAtender(false);
    }
  };

  const handleOpenEditModal = (cita: CitaResponseEnriquecida) => {
    const dt = new Date(cita.fecha_hora);
    setSelectedCitaId(cita.id);
    setSelectedCitaDetail(cita);
    setEditCitaForm({
      fecha: dt.toISOString().split('T')[0],
      hora: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
      medico_id: String(cita.medico_id),
      estado: cita.estado,
      notas: cita.notas || '',
    });
    setActiveModal('edit');
  };

  const handleUpdateCita = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCitaId) return;
    setIsUpdatingCita(true);
    try {
      const payload: CitaUpdate = {
        fecha_hora: `${editCitaForm.fecha}T${editCitaForm.hora}:00`,
        medico_id: Number(editCitaForm.medico_id),
        estado: editCitaForm.estado,
        notas: editCitaForm.notas,
      };
      await updateCita(selectedCitaId, payload);
      showToast('Cita actualizada exitosamente', 'success');
      setActiveModal(null);
      await loadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'No se pudo actualizar la cita', 'error');
    } finally {
      setIsUpdatingCita(false);
    }
  };

  const handleOpenDeleteModal = (citaId: number) => {
    setSelectedCitaId(citaId);
    setActiveModal('delete');
  };

  const handleConfirmDelete = async () => {
    if (!selectedCitaId) return;
    try {
      await deleteCita(selectedCitaId);
      showToast('La cita ha sido cancelada exitosamente', 'success');
      setActiveModal(null);
      await loadCitas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'No se pudo cancelar la cita', 'error');
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
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold"
             style={{
               backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
               color: toast.type === 'success' ? '#065F46' : '#991B1B',
               borderColor: toast.type === 'success' ? '#A7F3D0' : '#FCA5A5',
             }}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          {isDoctor ? 'Mis Citas' : 'Gestión de Citas'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isDoctor
            ? 'Consulta el detalle y atiende citas registrando los datos clínicos de la paciente.'
            : 'Administra el calendario de citas del servicio obstétrico.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">{errorMsg}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar paciente</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Nombre o DNI..."
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label>
            <input
              type="date"
              value={filterFecha}
              onChange={e => setFilterFecha(e.target.value)}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado</label>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
            >
              <option value="">Todos</option>
              <option value="programada">Programada</option>
              <option value="en_atencion">En atención</option>
              <option value="cumplida">Cumplida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
        {(searchQuery || filterFecha || filterEstado) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setFilterFecha(''); setFilterEstado(''); }}
            className="mt-3 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {citasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No hay citas que coincidan con los filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Fecha</th>
                  <th className="py-3.5 px-4">Hora</th>
                  <th className="py-3.5 px-4">Paciente</th>
                  <th className="py-3.5 px-4">Médico</th>
                  <th className="py-3.5 px-4">Tipo de Cita</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {citasFiltradas.map((cita) => (
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
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                      {cita.medico_nombre ? `Dr. ${cita.medico_nombre.split(' ')[0]}` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{cita.motivo || 'N/A'}</td>
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          Ver
                        </button>

                        {isDoctor ? (
                          (cita.estado === 'programada' || cita.estado === 'en_atencion') ? (
                            <button
                              onClick={() => handleOpenAtender(cita)}
                              title="Atender cita y registrar datos clínicos"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                              style={{ backgroundColor: '#F5EDF2', color: PRIMARY, borderColor: '#E8D5EF' }}
                            >
                              Atender
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
                              disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-30 disabled:pointer-events-none"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(cita.id)}
                              disabled={cita.estado === 'cumplida' || cita.estado === 'cancelada'}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-30 disabled:pointer-events-none"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeModal === 'detail' && (
        <CitaDetailModal
          cita={selectedCitaDetail}
          perfil={selectedPatientPerfil}
          isLoading={isLoadingPerfil}
          isDoctor={isDoctor}
          onClose={() => setActiveModal(null)}
          onIniciarConsulta={handleIniciarConsulta}
          onAtender={handleAtenderFromDetail}
          onVerExpediente={() => {
            if (selectedCitaDetail) {
              navigate(`/pacientes/${selectedCitaDetail.paciente_id}`, { state: { initialTab: 'clinico' } });
            }
          }}
        />
      )}

      {activeModal === 'atender' && selectedCitaDetail && (
        <AtenderCitaModal
          cita={selectedCitaDetail}
          form={atenderDcForm}
          hasExistingData={dcExists}
          isSaving={isSavingAtender}
          onClose={() => setActiveModal(null)}
          onChange={setAtenderDcForm}
          onSubmit={handleAtender}
        />
      )}

      {activeModal === 'edit' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gray-900">Editar Cita</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleUpdateCita} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Obstetra *</label>
                <select required value={editCitaForm.medico_id}
                  onChange={e => setEditCitaForm(prev => ({ ...prev, medico_id: e.target.value }))}
                  className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
                  {medicos.map(m => (
                    <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Fecha *</label>
                  <input type="date" required value={editCitaForm.fecha}
                    onChange={e => setEditCitaForm(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Hora *</label>
                  <input type="time" required value={editCitaForm.hora}
                    onChange={e => setEditCitaForm(prev => ({ ...prev, hora: e.target.value }))}
                    className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Estado *</label>
                <select required value={editCitaForm.estado}
                  onChange={e => setEditCitaForm(prev => ({ ...prev, estado: e.target.value as CitaResponseEnriquecida['estado'] }))}
                  className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
                  <option value="programada">Programada</option>
                  <option value="en_atencion">En Atención</option>
                  <option value="cumplida">Cumplida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Notas</label>
                <textarea rows={3} value={editCitaForm.notas}
                  onChange={e => setEditCitaForm(prev => ({ ...prev, notas: e.target.value }))}
                  className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="py-2.5 px-4 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
                  Cancelar
                </button>
                <button type="submit" disabled={isUpdatingCita} className="py-2.5 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
                  {isUpdatingCita ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'delete' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 text-center space-y-4">
            <h3 className="font-extrabold text-lg text-gray-950">¿Cancelar esta cita?</h3>
            <p className="text-sm text-gray-500">Esta acción marcará la cita como cancelada de forma definitiva.</p>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
                Volver
              </button>
              <button type="button" onClick={handleConfirmDelete} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
