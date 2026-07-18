import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const { token } = JSON.parse(userInfo);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('api request interceptor parse userInfo error', e);
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Global response interceptor: on 401 redirect to home (avoid forcing /login on transient errors)
api.interceptors.response.use(
  response => response,
  (error) => {
    try {
      const status = error?.response?.status;
      if (status === 401) {
        window.location.href = '/';
      }
    } catch (e) {
      console.error('api response interceptor error handling', e);
    }
    return Promise.reject(error);
  }
);

export default api;
