import axios from 'axios';

function normalizeApiBaseUrl(raw?: string): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return 'http://localhost:3000';
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRoute =
      window.location.hash === '#/login' ||
      window.location.pathname === '/login';
    if (error.response?.status === 401 && !isLoginRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '#/login';
      window.location.reload();
    }
    return Promise.reject(error);
  },
);
