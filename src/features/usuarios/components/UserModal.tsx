import type { FormEvent, ChangeEvent } from 'react';
import { PRIMARY } from '../../../constants/theme';
import { useModalBackdrop } from '../../../hooks/useModalBackdrop';
import type { RolResponse } from '../../../services/api';

export interface UserForm {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  rol_id: string;
}

export const emptyUserForm: UserForm = {
  username: '',
  email: '',
  password: '',
  nombre: '',
  apellidos: '',
  rol_id: '',
};

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  secretaria: 'Secretaria',
};

function rolLabel(nombre: string): string {
  return ROL_LABELS[nombre] ?? nombre;
}

interface UserModalProps {
  mode: 'create' | 'edit';
  form: UserForm;
  roles: RolResponse[];
  rolNombre?: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function UserModal({
  mode,
  form,
  roles,
  rolNombre,
  isSaving,
  onClose,
  onSubmit,
  onChange,
}: UserModalProps) {
  const inputCls = 'w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none transition-all bg-white';
  const borderNormal = '#E8D5EF';
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" {...backdrop}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">{mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre de usuario *</label>
            <input
              name="username"
              required
              value={form.username}
              onChange={onChange}
              placeholder="ej. dr.garcia"
              autoComplete="off"
              className={inputCls}
              style={{ borderColor: borderNormal }}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Único en el sistema. Solo minúsculas, números, punto, guion o guion bajo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nombres *</label>
              <input name="nombre" required value={form.nombre} onChange={onChange} className={inputCls} style={{ borderColor: borderNormal }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Apellidos *</label>
              <input name="apellidos" required value={form.apellidos} onChange={onChange} className={inputCls} style={{ borderColor: borderNormal }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Correo electrónico *</label>
            <input type="email" name="email" required value={form.email} onChange={onChange} className={inputCls} style={{ borderColor: borderNormal }} />
            <p className="text-[10px] text-gray-400 mt-1">Puede repetirse entre cuentas distintas.</p>
          </div>
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Contraseña *</label>
              <input type="password" name="password" required minLength={6} value={form.password} onChange={onChange} placeholder="Mínimo 6 caracteres" className={inputCls} style={{ borderColor: borderNormal }} />
            </div>
          )}
          {mode === 'create' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Rol *</label>
              <select name="rol_id" required value={form.rol_id} onChange={onChange} className={inputCls} style={{ borderColor: borderNormal }}>
                <option value="">Seleccionar rol</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{rolLabel(r.nombre)}</option>
                ))}
              </select>
              <p className="text-[10px] text-amber-700 mt-1">El rol no podrá cambiarse después. Para otro rol, cree una cuenta nueva.</p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-900">
              Rol: <strong>{rolNombre ? rolLabel(rolNombre) : '—'}</strong>
              <p className="text-[10px] mt-1">El tipo de usuario es permanente.</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-gray-700" style={{ borderColor: borderNormal }}>Cancelar</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
              {isSaving ? 'Guardando...' : mode === 'create' ? 'Crear usuario' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
