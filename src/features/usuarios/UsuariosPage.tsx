import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
  getUsuarios,
  getRoles,
  createUsuario,
  updateUsuario,
  desactivarUsuario,
  getCurrentUser,
} from '../../services/api';
import type { RolResponse, UsuarioResponse } from '../../services/api';
import UserModal, { emptyUserForm, type UserForm } from './components/UserModal';
import HorarioMedicoModal from './components/HorarioMedicoModal';
import { useModalBackdrop } from '../../hooks/useModalBackdrop';

const PRIMARY = '#612853';

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  secretaria: 'Secretaria',
};

function rolLabel(nombre: string): string {
  return ROL_LABELS[nombre] ?? nombre;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  return fallback;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function validateUsername(value: string, usuarios: UsuarioResponse[], excludeId?: number): string | null {
  const username = normalizeUsername(value);
  if (!username) return 'Ingrese un nombre de usuario';
  if (username.length < 3) return 'El usuario debe tener al menos 3 caracteres';
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return 'Solo letras minúsculas, números, punto, guion o guion bajo';
  }
  const exists = usuarios.some(
    u => u.id !== excludeId && u.username.toLowerCase() === username,
  );
  if (exists) return 'Ese nombre de usuario ya está en uso';
  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(nombre: string, apellidos: string): string {
  return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [roles, setRoles] = useState<RolResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');

  const [modal, setModal] = useState<'create' | 'edit' | 'horario' | 'deactivate' | null>(null);
  const [horarioUser, setHorarioUser] = useState<UsuarioResponse | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UsuarioResponse | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUserForm);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [currentUserId, setCurrentUserId] = useState(
    () => Number(localStorage.getItem('user_id') || 0),
  );
  const deactivateBackdrop = useModalBackdrop(() => {
    setModal(prev => (prev === 'deactivate' ? null : prev));
    setDeactivateUser(null);
  });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, rolesData] = await Promise.all([getUsuarios(), getRoles()]);
      setUsuarios(users);
      setRoles(rolesData);
    } catch {
      showToast('Error al cargar usuarios', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    getCurrentUser()
      .then(me => {
        setCurrentUserId(me.id);
        localStorage.setItem('user_id', String(me.id));
      })
      .catch(() => { /* ignore */ });
  }, [loadData]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter(u => {
      if (filtroEstado === 'activos' && !u.activo) return false;
      if (filtroEstado === 'inactivos' && u.activo) return false;
      if (filtroRol !== 'todos' && u.rol.nombre !== filtroRol) return false;
      if (!q) return true;
      const full = `${u.nombre} ${u.apellidos} ${u.username} ${u.email}`.toLowerCase();
      return full.includes(q);
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const conteos = useMemo(() => ({
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    medicos: usuarios.filter(u => u.rol.nombre === 'medico' && u.activo).length,
    secretarias: usuarios.filter(u => u.rol.nombre === 'secretaria' && u.activo).length,
  }), [usuarios]);

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleOpenCreate = () => {
    const defaultRol = roles.find(r => r.nombre === 'medico') ?? roles[0];
    setForm({
      ...emptyUserForm,
      rol_id: defaultRol ? String(defaultRol.id) : '',
    });
    setEditId(null);
    setModal('create');
  };

  const handleOpenEdit = (u: UsuarioResponse) => {
    setForm({
      username: u.username,
      email: u.email,
      password: '',
      nombre: u.nombre,
      apellidos: u.apellidos,
      rol_id: String(u.rol.id),
    });
    setEditId(u.id);
    setModal('edit');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const usernameErr = validateUsername(
      form.username,
      usuarios,
      modal === 'edit' ? editId ?? undefined : undefined,
    );
    if (usernameErr) {
      showToast(usernameErr, 'error');
      return;
    }
    setIsSaving(true);
    try {
      if (modal === 'create') {
        await createUsuario({
          username: normalizeUsername(form.username),
          email: form.email.trim(),
          password: form.password,
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          rol_id: Number(form.rol_id),
        });
        showToast('Usuario creado correctamente', 'success');
      } else if (editId) {
        await updateUsuario(editId, {
          username: normalizeUsername(form.username),
          email: form.email.trim(),
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
        });
        showToast('Usuario actualizado', 'success');
      }
      setModal(null);
      await loadData();
    } catch (err: unknown) {
      showToast(apiErrorMessage(err, 'Error al guardar usuario'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeactivate = (u: UsuarioResponse) => {
    if (u.id === currentUserId) {
      showToast('No puede desactivar su propia cuenta', 'error');
      return;
    }
    setDeactivateUser(u);
    setModal('deactivate');
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateUser) return;
    setIsSaving(true);
    try {
      const { usuario: updated, citas_canceladas } = await desactivarUsuario(deactivateUser.id);
      setUsuarios(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setModal(null);
      setDeactivateUser(null);
      const citasMsg = citas_canceladas > 0
        ? ` Se cancelaron ${citas_canceladas} cita(s) futura(s).`
        : '';
      showToast(
        `${updated.nombre} ${updated.apellidos} fue desactivado.${citasMsg} Use el filtro "Solo inactivos" para verlo.`,
        'success',
      );
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'No se pudo desactivar el usuario', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReactivar = async (u: UsuarioResponse) => {
    setIsSaving(true);
    try {
      const updated = await updateUsuario(u.id, { activo: true });
      setUsuarios(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      showToast('Usuario reactivado', 'success');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'No se pudo reactivar el usuario', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-[#FDF8FA] min-h-screen space-y-5">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Gestión</p>
          <h1 className="text-2xl font-extrabold text-gray-900">Usuarios del Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Administra cuentas, roles y acceso al SAT Obstetricare
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white hover:opacity-90 shadow-sm self-start"
          style={{ backgroundColor: PRIMARY }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total usuarios', value: conteos.total, color: PRIMARY },
          { label: 'Activos', value: conteos.activos, color: '#16A34A' },
          { label: 'Médicos', value: conteos.medicos, color: '#2563EB' },
          { label: 'Secretarias', value: conteos.secretarias, color: '#CA8A04' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{k.label}</p>
            <p className="text-3xl font-extrabold mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Buscar por nombre o correo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-fuchsia-300"
        />
        <select
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value)}
          className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 bg-white"
        >
          <option value="todos">Todos los roles</option>
          {roles.map(r => (
            <option key={r.id} value={r.nombre}>{rolLabel(r.nombre)}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 bg-white"
        >
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-4 animate-spin"
              style={{ borderTopColor: PRIMARY }}
            />
            <p className="text-sm text-gray-400">Cargando usuarios...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm font-medium">
            No se encontraron usuarios con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Usuario</th>
                  <th className="py-3.5 px-4">Correo</th>
                  <th className="py-3.5 px-4">Rol</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Registro</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: PRIMARY }}
                        >
                          {getInitials(u.nombre, u.apellidos)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {u.nombre} {u.apellidos}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{u.email}</td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-100">
                        {rolLabel(u.rol.nombre)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          u.activo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        {u.rol.nombre === 'medico' && (
                          <button
                            onClick={() => { setHorarioUser(u); setModal('horario'); }}
                            className="p-2 rounded-lg text-fuchsia-700 hover:bg-fuchsia-50"
                            title="Horario de atención"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                          title="Editar usuario"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {u.activo ? (
                          <button
                            onClick={() => handleOpenDeactivate(u)}
                            disabled={u.id === currentUserId || isSaving}
                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={u.id === currentUserId ? 'No puede desactivar su propia cuenta' : 'Desactivar usuario'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivar(u)}
                            disabled={isSaving}
                            className="p-2 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                            title="Reactivar usuario"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
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

      {modal === 'horario' && horarioUser && (
        <HorarioMedicoModal
          medicoId={horarioUser.id}
          medicoNombre={`${horarioUser.nombre} ${horarioUser.apellidos}`}
          onClose={() => { setModal(null); setHorarioUser(null); }}
        />
      )}

      {modal === 'deactivate' && deactivateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" {...deactivateBackdrop}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-8 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-xl font-extrabold text-gray-900">¿Desactivar usuario?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>{deactivateUser.nombre} {deactivateUser.apellidos}</strong> no podrá iniciar sesión.
                <strong> No se borra su historial</strong>; puede reactivarse desde este listado.
              </p>
              {deactivateUser.rol?.nombre === 'medico' && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-left text-sm text-red-800">
                  <p className="font-semibold">Médico: citas futuras</p>
                  <p className="text-xs mt-1 text-red-700">
                    Al confirmar, se cancelarán automáticamente las citas programadas o en atención con fecha futura.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setModal(null); setDeactivateUser(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? 'Desactivando...' : 'Confirmar desactivación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && modal !== 'horario' && modal !== 'deactivate' && (
        <UserModal
          mode={modal}
          form={form}
          roles={roles}
          rolNombre={editId ? usuarios.find(u => u.id === editId)?.rol.nombre : undefined}
          isSaving={isSaving}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
        />
      )}
    </div>
  );
}
