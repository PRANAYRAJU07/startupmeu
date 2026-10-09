import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setAccessToken } from '../../lib/api-client.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.data);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Try to refresh token on initial load, since it sets the access token
    const initAuth = async () => {
      try {
        const res = await apiClient.post('/auth/refresh');
        setAccessToken(res.data.data.accessToken);
        await fetchUser();
      } catch (err) {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for unauthorized events to logout locally
    const handleUnauthorized = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    await fetchUser();
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
