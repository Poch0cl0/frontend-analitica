import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
  getUsuarios,
  getRoles,
  createUsuario,
  updateUsuario,
  desactivarUsuario,
} from '../../services/api';
import type { RolResponse, UsuarioResponse } from '../../services/api';

const PRIMARY = '#612853';

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  secretaria: 'Secretaria',
};

function rolLabel(nombre: string): string {
  return ROL_LABELS[nombre] ?? nombre;
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

interface UserForm {
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  rol_id: string;
}

const emptyForm: UserForm = {
  email: '',
  password: '',
  nombre: '',
  apellidos: '',
  rol_id: '',
};

interface UserModalProps {
  mode: 'create' | 'edit';
  form: UserForm;
  roles: RolResponse[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function UserModal({ mode, form, roles, isSaving, onClose, onSubmit, onChange }: UserModalProps) {
  const inputCls =
    'w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white';
  const borderNormal = '#E8D5EF';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#F5EDF2' }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: PRIMARY }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nombres *</label>
              <input
                name="nombre"
                required
                value={form.nombre}
                onChange={onChange}
                className={inputCls}
                style={{ borderColor: borderNormal }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Apellidos *</label>
              <input
                name="apellidos"
                required
                value={form.apellidos}
                onChange={onChange}
                className={inputCls}
                style={{ borderColor: borderNormal }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Correo electrónico *</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={onChange}
              className={inputCls}
              style={{ borderColor: borderNormal }}
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Contraseña *</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={form.password}
                onChange={onChange}
                placeholder="Mínimo 6 caracteres"
                className={inputCls}
                style={{ borderColor: borderNormal }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Rol *</label>
            <select
              name="rol_id"
              required
              value={form.rol_id}
              onChange={onChange}
              className={inputCls}
              style={{ borderColor: borderNormal }}
            >
              <option value="">Seleccionar rol</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {rolLabel(r.nombre)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-gray-50"
              style={{ borderColor: borderNormal }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: PRIMARY }}
            >
              {isSaving ? 'Guardando...' : mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [roles, setRoles] = useState<RolResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
  }, [loadData]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter(u => {
      if (filtroEstado === 'activos' && !u.activo) return false;
      if (filtroEstado === 'inactivos' && u.activo) return false;
      if (filtroRol !== 'todos' && u.rol.nombre !== filtroRol) return false;
      if (!q) return true;
      const full = `${u.nombre} ${u.apellidos} ${u.email}`.toLowerCase();
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
      ...emptyForm,
      rol_id: defaultRol ? String(defaultRol.id) : '',
    });
    setEditId(null);
    setModal('create');
  };

  const handleOpenEdit = (u: UsuarioResponse) => {
    setForm({
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
    setIsSaving(true);
    try {
      if (modal === 'create') {
        await createUsuario({
          email: form.email.trim(),
          password: form.password,
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          rol_id: Number(form.rol_id),
        });
        showToast('Usuario creado correctamente', 'success');
      } else if (editId) {
        await updateUsuario(editId, {
          email: form.email.trim(),
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          rol_id: Number(form.rol_id),
        });
        showToast('Usuario actualizado', 'success');
      }
      setModal(null);
      await loadData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'Error al guardar usuario', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDesactivar = async (u: UsuarioResponse) => {
    if (!window.confirm(`¿Desactivar a ${u.nombre} ${u.apellidos}?`)) return;
    try {
      await desactivarUsuario(u.id);
      showToast('Usuario desactivado', 'success');
      await loadData();
    } catch {
      showToast('No se pudo desactivar el usuario', 'error');
    }
  };

  const handleReactivar = async (u: UsuarioResponse) => {
    try {
      await updateUsuario(u.id, { activo: true });
      showToast('Usuario reactivado', 'success');
      await loadData();
    } catch {
      showToast('No se pudo reactivar el usuario', 'error');
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
                          <p className="text-[10px] text-gray-400 font-mono">ID #{u.id}</p>
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
                            onClick={() => handleDesactivar(u)}
                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="Desactivar usuario"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivar(u)}
                            className="p-2 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
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

      {modal && (
        <UserModal
          mode={modal}
          form={form}
          roles={roles}
          isSaving={isSaving}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
        />
      )}
    </div>
  );
}
