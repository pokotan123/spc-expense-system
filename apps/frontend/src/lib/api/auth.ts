import { api } from './client';
import { AuthResponse, Member } from '@/types';

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getCurrentMember: async (): Promise<Member> => {
    const response = await api.get<Member>('/members/me');
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/members/me/dashboard');
    return response.data;
  },
};
