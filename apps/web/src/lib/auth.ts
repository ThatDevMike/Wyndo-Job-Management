import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const API_URL = '/api';

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Login failed' });
            return false;
          }

          set({
            user: data.user,
            accessToken: data.tokens?.accessToken || data.accessToken,
            refreshToken: data.tokens?.refreshToken || data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          set({ isLoading: false, error: 'Network error. Please try again.' });
          return false;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Registration failed' });
            return false;
          }

          set({
            user: data.user,
            accessToken: data.tokens?.accessToken || data.accessToken,
            refreshToken: data.tokens?.refreshToken || data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          set({ isLoading: false, error: 'Network error. Please try again.' });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'wyndo-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// API helper with auth headers
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { accessToken } = useAuth.getState();
  
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    useAuth.getState().logout();
    window.location.href = '/auth/login';
  }

  return response;
}
