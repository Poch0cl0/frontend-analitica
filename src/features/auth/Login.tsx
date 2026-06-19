import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

// ==================== TIPOS Y INTERFACES ====================

type UserRole = 'medico' | 'secretaria' | 'administrador';

interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole;
}

interface LoginResponse {
  access_token: string;
  token_type?: string;
}

interface FormState {
  email: string;
  password: string;
  role: UserRole;
}

// ==================== CONSTANTES ====================

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'medico', label: 'Médico' },
  { value: 'secretaria', label: 'Secretaria' },
  { value: 'administrador', label: 'Administrador' },
];

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Email o contraseña incorrectos',
  401: 'No autorizado. Verifica tus credenciales',
  500: 'Error del servidor. Intenta más tarde',
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormState>({
    email: '',
    password: '',
    role: 'medico',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== HANDLERS ====================

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error cuando el usuario empieza a escribir
    if (error) {
      setError(null);
    }
  };

  const handleRoleChange = (role: UserRole): void => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    // Validaciones básicas
    if (!formData.email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }

    if (!formData.password.trim()) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      const loginPayload: LoginRequest = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      const response = await api.post<LoginResponse>(
        '/api/auth/login',
        loginPayload
      );

      const { access_token } = response.data;

      // Guardar token en localStorage
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_role', formData.role);
      localStorage.setItem('user_email', formData.email);

      // Redirigir al dashboard
      navigate('/dashboard');
    } catch (err) {
      const apiError = err as { response?: { status: number; data?: { detail?: string } } };

      let errorMessage = 'Error al iniciar sesión. Intenta de nuevo';

      if (apiError.response) {
        const status = apiError.response.status;
        errorMessage =
          ERROR_MESSAGES[status] ||
          apiError.response.data?.detail ||
          errorMessage;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== JSX ====================

  return (
    <div className="min-h-screen flex bg-white">
      {/* COLUMNA IZQUIERDA - Visual (Hidden en móviles) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#FDF8FA] to-gray-50 flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <img
            src="/logo.png"
            alt="Obstetricare"
            className="w-16 h-16 object-contain drop-shadow-lg"
          />

          {/* Título con color secundario */}
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-bold text-gray-900">Obstetricare</h1>
            <span
              className="inline-block w-1 h-10 rounded-full"
              style={{ backgroundColor: '#CE7E9D' }}
            ></span>
          </div>

          <p className="text-gray-600 text-sm max-w-xs">
            Sistema de análisis y gestión integral para cuidado obstétrico
          </p>
        </div>
      </div>

      {/* COLUMNA DERECHA - Formulario */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Bienvenida */}
          <div className="mb-8">
            {/* Logo para mobile */}
            <div className="lg:hidden flex flex-col items-center gap-2 mb-6">
              <img src="/logo.png" alt="Obstetricare" className="w-12 h-12 object-contain" />
              <h1 className="text-3xl font-bold text-gray-900">Obstetricare</h1>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Bienvenido de nuevo
            </h2>
            <p className="text-center text-gray-600 text-sm mt-2">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Selector de Rol */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de usuario
            </label>

            <div className="flex gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleRoleChange(role.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                    formData.role === role.value
                      ? 'border-obstetric-base bg-white'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
                  style={
                    formData.role === role.value
                      ? { borderColor: '#7C3F6B', color: '#7C3F6B' }
                      : {}
                  }
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div
                className="p-3 rounded-lg text-sm text-white flex items-center gap-2"
                style={{ backgroundColor: '#BA1A1A' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                style={{
                  focusBorderColor: '#7C3F6B',
                  '--tw-ring-color': '#7C3F6B',
                } as React.CSSProperties}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                style={{
                  focusBorderColor: '#7C3F6B',
                  '--tw-ring-color': '#7C3F6B',
                } as React.CSSProperties}
              />
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#7C3F6B' }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              ¿Necesitas ayuda?{' '}
              <a href="#support" className="font-medium hover:underline" style={{ color: '#7C3F6B' }}>
                Contáctanos
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
