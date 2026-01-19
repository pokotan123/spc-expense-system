import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Member } from '@/types';

interface AuthState {
  member: Member | null;
  accessToken: string | null;
  setAuth: (member: Member, accessToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      member: null,
      accessToken: null,
      setAuth: (member, accessToken) => {
        set({ member, accessToken });
      },
      clearAuth: () => {
        set({ member: null, accessToken: null });
      },
      isAuthenticated: () => {
        return get().member !== null && get().accessToken !== null;
      },
    }),
    {
      name: 'auth-storage', // localStorageのキー名
      storage: createJSONStorage(() => localStorage),
    }
  )
);
