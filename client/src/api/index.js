import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(success) {
    refreshSubscribers.forEach(cb => cb(success));
    refreshSubscribers = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const isAuthEndpoint =
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/refresh') ||
            originalRequest.url?.includes('/auth/logout');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshSubscribers.push((success) => {
                        if (success) resolve(api(originalRequest));
                        else reject(error);
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await api.post('/auth/refresh');
                onRefreshed(true);
                isRefreshing = false;
                return api(originalRequest);
            } catch (refreshError) {
                onRefreshed(false);
                isRefreshing = false;
                window.dispatchEvent(new CustomEvent('auth:expired'));
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
