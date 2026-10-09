import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// We can store the access token in memory
let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

// Request interceptor: attach access token if available
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and attempt refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401, not already retrying, and not the refresh endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .then(res => {
              const newAccessToken = res.data.data.accessToken;
              setAccessToken(newAccessToken);
              return newAccessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
