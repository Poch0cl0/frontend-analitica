import { useState } from 'react';

import type { FormEvent, ChangeEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import { Eye, EyeOff } from 'lucide-react';

import { api, getCurrentUser } from '../../services/api';

import { normalizeRole } from '../../utils/role';



interface LoginResponse {

  access_token: string;

  token_type?: string;

}



interface FormState {
  username: string;
  password: string;
}



const ERROR_MESSAGES: Record<number, string> = {

  400: 'Usuario o contraseña incorrectos',

  401: 'No autorizado. Verifica tus credenciales',

  500: 'Error del servidor. Intenta más tarde',

};



export default function Login() {

  const navigate = useNavigate();



  const [formData, setFormData] = useState<FormState>({
    username: '',
    password: '',
  });



  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);



  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {

    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (error) setError(null);

  };



  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {

    e.preventDefault();

    setError(null);



    if (!formData.username.trim()) {
      setError('Por favor ingresa tu usuario');
      return;
    }

    if (!formData.password.trim()) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
      });

      const { access_token } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_username', formData.username.trim().toLowerCase());



      try {

        const me = await getCurrentUser();

        localStorage.setItem('user_role', normalizeRole(me.rol));
        localStorage.setItem('user_id', String(me.id));

      } catch {

        localStorage.setItem('user_role', 'medico');

      }



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



  return (

    <div className="min-h-screen flex bg-white">

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#FDF8FA] to-gray-50 flex-col items-center justify-center p-8 relative overflow-hidden">

        <div className="relative z-10 flex flex-col items-center gap-3 text-center">

          <img

            src="/logo.png"

            alt="Obstetricare"

            className="w-16 h-16 object-contain drop-shadow-lg"

          />

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



      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8">

        <div className="w-full max-w-sm">

          <div className="mb-8">

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



          <form onSubmit={handleSubmit} className="space-y-5">

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



            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="ej. admin"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>



            <div>

              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">

                Contraseña

              </label>

              <div className="relative">

                <input

                  id="password"

                  name="password"

                  type={showPassword ? 'text' : 'password'}

                  value={formData.password}

                  onChange={handleInputChange}

                  disabled={isLoading}

                  placeholder="••••••••"

                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:bg-gray-50 disabled:text-gray-500"

                />

                <button

                  type="button"

                  onClick={() => setShowPassword((v) => !v)}

                  disabled={isLoading}

                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"

                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}

                >

                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}

                </button>

              </div>

            </div>



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

        </div>

      </div>

    </div>

  );

}

