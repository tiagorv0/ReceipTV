import { AxiosResponse } from 'axios';
import api from './index';
import type { LoginRequest, RegisterRequest, LoginResponse } from '@/types/auth';
import type { Receipt, ReceiptFilters, AnalysisResult } from '@/types/receipt';
import type { UserPublic } from '@/types/user';
import type { SummaryResponse, ExportParams, CalendarResponse } from '@/types/api';

export const login = (credentials: LoginRequest): Promise<AxiosResponse<LoginResponse>> =>
    api.post('/auth/login', credentials);

export const register = (userData: RegisterRequest): Promise<AxiosResponse<void>> =>
    api.post('/auth/register', userData);

export const getReceipts = (filters?: ReceiptFilters): Promise<AxiosResponse<Receipt[]>> =>
    api.get('/receipts', { params: filters });

export const analyzeReceipt = (formData: FormData): Promise<AxiosResponse<AnalysisResult>> =>
    api.post('/receipts/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteReceipt = (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/receipts/${id}`);

export const getReceiptFile = (id: number): Promise<AxiosResponse<Blob>> =>
    api.get(`/receipts/${id}/file`, { responseType: 'blob' });

export const getSummary = (): Promise<AxiosResponse<SummaryResponse>> =>
    api.get('/reports/summary');

export const getProfile = (): Promise<AxiosResponse<UserPublic>> =>
    api.get('/auth/profile');

export const updatePassword = (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<void>> =>
    api.put('/auth/password', data);

export const deleteAccount = (data: { password: string }): Promise<AxiosResponse<void>> =>
    api.delete('/auth/account', { data });

export const createManualReceipt = (formData: FormData): Promise<AxiosResponse<Receipt>> =>
    api.post('/receipts/manual', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateReceipt = (id: number, formData: FormData): Promise<AxiosResponse<Receipt>> =>
    api.put(`/receipts/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const exportReceipts = (params: ExportParams): Promise<AxiosResponse<void | Blob>> =>
    params.delivery === 'email'
        ? api.post('/receipts/export', params)
        : api.post('/receipts/export', params, { responseType: 'blob' });

export const getCalendarData = (params: {
    startDate: string;
    endDate: string;
    banco?: string;
    tipoPagamento?: string;
}): Promise<AxiosResponse<CalendarResponse>> =>
    api.get('/reports/calendar', { params });
