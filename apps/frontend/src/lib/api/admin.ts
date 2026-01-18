import { api } from './client';
import { ExpenseApplication } from '@/types';

export const adminApi = {
  getApplications: async (params?: {
    status?: string;
    memberId?: number;
    departmentId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ExpenseApplication[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await api.get('/admin/expense-applications', { params });
    return response.data;
  },

  getApplicationById: async (id: number): Promise<ExpenseApplication> => {
    const response = await api.get<ExpenseApplication>(`/admin/expense-applications/${id}`);
    return response.data;
  },

  approve: async (id: number, data: {
    internalCategoryId: number;
    finalAmount: number;
    comment?: string;
  }): Promise<ExpenseApplication> => {
    const response = await api.post<ExpenseApplication>(`/admin/expense-applications/${id}/approve`, data);
    return response.data;
  },

  reject: async (id: number, data: {
    comment: string;
  }): Promise<ExpenseApplication> => {
    const response = await api.post<ExpenseApplication>(`/admin/expense-applications/${id}/reject`, data);
    return response.data;
  },

  cancel: async (id: number, data: {
    comment: string;
  }): Promise<ExpenseApplication> => {
    const response = await api.post<ExpenseApplication>(`/admin/expense-applications/${id}/cancel`, data);
    return response.data;
  },

  getPaymentTargets: async (params?: {
    startDate?: string;
    endDate?: string;
    includePaid?: boolean;
  }) => {
    const response = await api.get('/admin/payments', { params });
    return response.data;
  },

  generatePaymentData: async (data: {
    expenseApplicationIds: number[];
  }) => {
    const response = await api.post('/admin/payments/generate', data);
    return response.data;
  },
};
