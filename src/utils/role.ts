export type NormalizedRole = 'medico' | 'secretaria' | 'administrador';

/** Mapea el rol del backend (admin) al rol usado en guards del frontend. */
export function normalizeRole(rol: string | null | undefined): NormalizedRole {
  if (!rol) return 'medico';
  if (rol === 'admin') return 'administrador';
  if (rol === 'medico' || rol === 'secretaria' || rol === 'administrador') return rol;
  return 'medico';
}

export function roleAllowed(rol: string | null | undefined, allowed: string[]): boolean {
  return allowed.includes(normalizeRole(rol));
}

export function getRoleLabel(rol: string | null | undefined): string {
  switch (normalizeRole(rol)) {
    case 'administrador':
      return 'Administrador';
    case 'secretaria':
      return 'Secretaría';
    case 'medico':
    default:
      return 'Médico Obstetra';
  }
}
