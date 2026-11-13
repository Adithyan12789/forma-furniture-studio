import axios from 'axios';

/** Single Axios instance. JWT (when present) rides along automatically. */
export const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('forma_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function fetchHealth(): Promise<{ db: string; phase: number } | null> {
  try {
    const { data } = await api.get('/health');
    return data;
  } catch {
    return null;
  }
}
