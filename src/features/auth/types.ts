/**
 * Tipos compartidos para autenticación
 */

export type UserRole = 'medico' | 'secretaria' | 'administrador';

export interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
}

export interface AuthUser {
  email: string;
  role: UserRole;
}
