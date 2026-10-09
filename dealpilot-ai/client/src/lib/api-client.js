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

    // If error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt to refresh the token. 
        // The refresh endpoint uses the HTTP-only cookie to authenticate.
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        // Update in-memory token
        const newAccessToken = res.data.data.accessToken;
        setAccessToken(newAccessToken);
        
        // Re-run the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        setAccessToken(null);
        // Dispatch custom event to trigger logout in UI
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
