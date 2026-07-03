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

export { API_BASE_URL };
