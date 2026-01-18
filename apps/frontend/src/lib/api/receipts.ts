import { api } from './client';
import { Receipt, OCRResult } from '@/types';

export const receiptApi = {
  upload: async (file: File, expenseApplicationId: number): Promise<Receipt> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expenseApplicationId', expenseApplicationId.toString());

    const response = await api.post<Receipt>('/receipts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getById: async (id: number): Promise<Receipt> => {
    const response = await api.get<Receipt>(`/receipts/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/receipts/${id}`);
  },

  executeOCR: async (id: number): Promise<OCRResult> => {
    const response = await api.post<OCRResult>(`/receipts/${id}/ocr`);
    return response.data;
  },

  updateOCRResult: async (id: number, data: {
    extractedDate?: string;
    extractedAmount?: number;
    extractedStoreName?: string;
  }): Promise<OCRResult> => {
    const response = await api.put<OCRResult>(`/receipts/${id}/ocr/update`, data);
    return response.data;
  },
};
