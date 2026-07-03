import { normalizeRole } from '../utils/role';

export function useUserRole() {
  const role = normalizeRole(localStorage.getItem('user_role'));
  return {
    role,
    isDoctor: role === 'medico',
    isSecretary: role === 'secretaria',
    isAdmin: role === 'administrador',
  };
}
