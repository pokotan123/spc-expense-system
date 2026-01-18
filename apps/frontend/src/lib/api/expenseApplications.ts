import { api } from './client';
import { ExpenseApplication } from '@/types';

export const expenseApplicationApi = {
  getList: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ExpenseApplication[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await api.get('/expense-applications', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ExpenseApplication> => {
    const response = await api.get<ExpenseApplication>(`/expense-applications/${id}`);
    return response.data;
  },

  create: async (data: {
    expenseDate: string;
    amount: number;
    description: string;
  }): Promise<ExpenseApplication> => {
    const response = await api.post<ExpenseApplication>('/expense-applications', data);
    return response.data;
  },

  update: async (id: number, data: {
    expenseDate?: string;
    amount?: number;
    description?: string;
  }): Promise<ExpenseApplication> => {
    const response = await api.put<ExpenseApplication>(`/expense-applications/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/expense-applications/${id}`);
  },

  submit: async (id: number): Promise<ExpenseApplication> => {
    const response = await api.post<ExpenseApplication>(`/expense-applications/${id}/submit`);
    return response.data;
  },
};
