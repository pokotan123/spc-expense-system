import { api } from './client';
import { InternalCategory } from '@/types';

export const internalCategoryApi = {
  getList: async (params?: {
    isActive?: boolean;
  }): Promise<InternalCategory[]> => {
    const response = await api.get<InternalCategory[]>('/internal-categories', { params });
    return response.data;
  },

  create: async (data: {
    name: string;
    code: string;
    description?: string;
  }): Promise<InternalCategory> => {
    const response = await api.post<InternalCategory>('/internal-categories', data);
    return response.data;
  },

  update: async (id: number, data: {
    name?: string;
    code?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<InternalCategory> => {
    const response = await api.put<InternalCategory>(`/internal-categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/internal-categories/${id}`);
  },
};
