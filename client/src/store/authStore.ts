import { create } from 'zustand';
import { api } from '@/services/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
}

function persist(token: string, user: AuthUser) {
  localStorage.setItem('forma_token', token);
  localStorage.setItem('forma_user', JSON.stringify(user));
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
    set({ user: data.user });
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    persist(data.token, data.user);
    set({ user: data.user });
  },

  logout: () => {
    localStorage.removeItem('forma_token');
    localStorage.removeItem('forma_user');
    set({ user: null });
  },

  restore: async () => {
    const token = localStorage.getItem('forma_token');
    const cached = localStorage.getItem('forma_user');
    if (token && cached) {
      try {
        set({ user: JSON.parse(cached) });
        const { data } = await api.get('/auth/me');
        set({ user: data.user });
      } catch {
        // Token rejected or API offline: keep cached user only if API is
        // unreachable; a 401 clears the session in the page flows.
      }
    }
    set({ ready: true });
  },
}));
