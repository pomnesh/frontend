const API_BASE = 'https://pomnesh-backend.hps-2.ru/api/v1';

export const endpoints = {
  login: `${API_BASE}/auth/login`,
  refresh: `${API_BASE}/auth/refresh`,
  updateUser: `${API_BASE}/user/`,
  getMe: `${API_BASE}/auth/me`
}; 