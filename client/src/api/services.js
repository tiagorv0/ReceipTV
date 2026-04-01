import api from './index';

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);

export const getReceipts = (startDate, endDate) => api.get('/receipts', { params: { startDate, endDate } });
export const analyzeReceipt = (formData) => api.post('/receipts/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteReceipt = (id) => api.delete(`/receipts/${id}`);
export const getReceiptFile = (id) => api.get(`/receipts/${id}/file`, { responseType: 'blob' });

export const getSummary = () => api.get('/reports/summary');

export const getProfile = () => api.get('/auth/profile');
export const updatePassword = (data) => api.put('/auth/password', data);
export const deleteAccount = (data) => api.delete('/auth/account', { data });

export const createManualReceipt = (formData) => api.post('/receipts/manual', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const exportReceipts = (params) =>
    params.delivery === 'email'
        ? api.post('/receipts/export', params)
        : api.post('/receipts/export', params, { responseType: 'blob' });
