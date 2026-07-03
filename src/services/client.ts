import axios from 'axios';

/** En dev vacío = mismo origen + proxy Vite (/api → localhost:8000). Útil con ngrok. */
const explicit = import.meta.env.VITE_API_URL as string | undefined;
const API_BASE_URL = explicit
  ? explicit
  : import.meta.env.DEV
    ? ''
    : 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as {
    response?: { data?: { detail?: unknown }; status?: number };
    code?: string;
    message?: string;
  };
  if (!ax.response) {
    if (ax.code === 'ERR_NETWORK' || ax.message?.includes('Network Error')) {
      return 'No hay conexión con el servidor. Verifica que el backend esté activo (uvicorn en el puerto 8000).';
    }
    return 'No hay conexión con el servidor. Verifica que el backend esté activo.';
  }
  const detail = ax.response.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  return fallback;
}

export { API_BASE_URL };
