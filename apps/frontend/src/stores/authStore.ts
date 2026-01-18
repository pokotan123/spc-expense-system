import { create } from 'zustand';
import { Member } from '@/types';

interface AuthState {
  member: Member | null;
  accessToken: string | null;
  setAuth: (member: Member, accessToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  member: null,
  accessToken: null,
  setAuth: (member, accessToken) => {
    set({ member, accessToken });
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
    }
  },
  clearAuth: () => {
    set({ member: null, accessToken: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },
  isAuthenticated: () => {
    return get().member !== null && get().accessToken !== null;
  },
}));
