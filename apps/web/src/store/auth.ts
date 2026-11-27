import { create } from 'zustand';
import type { AuthResponse, AuthUserDTO } from '@voidlink/shared';
import { api, ApiError, refreshSession, setAccessToken } from '../lib/api';
import { disconnectRealtime } from '../lib/socket';
import { useChatStore } from './chat';

type AuthStatus = 'booting' | 'anonymous' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  user: AuthUserDTO | null;
  pending: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (input: {
    username: string;
    displayName: string;
    email: string;
    password: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function applySession(session: AuthResponse) {
  setAccessToken(session.accessToken);
  useChatStore.getState().startSession(session.user.id, session.accessToken);
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'booting',
  user: null,
  pending: false,
  error: null,

  clearError: () => set({ error: null }),

  bootstrap: async () => {
    try {
      const session = await refreshSession();
      if (session) {
        applySession(session);
        set({ status: 'authenticated', user: session.user, error: null });
      } else {
        set({ status: 'anonymous', user: null });
      }
    } catch {
      set({ status: 'anonymous', user: null });
    }
  },

  login: async (identifier, password) => {
    set({ pending: true, error: null });
    try {
      const session = await api.post<AuthResponse>('/v1/auth/login', { identifier, password });
      applySession(session);
      set({ status: 'authenticated', user: session.user, pending: false });
      return true;
    } catch (error) {
      set({
        pending: false,
        error: error instanceof ApiError ? error.message : 'Could not reach the gate',
      });
      return false;
    }
  },

  register: async (input) => {
    set({ pending: true, error: null });
    try {
      const session = await api.post<AuthResponse>('/v1/auth/register', input);
      applySession(session);
      set({ status: 'authenticated', user: session.user, pending: false });
      return true;
    } catch (error) {
      set({
        pending: false,
        error: error instanceof ApiError ? error.message : 'Could not reach the gate',
      });
      return false;
    }
  },

  logout: async () => {
    await api.post('/v1/auth/logout').catch(() => {});
    disconnectRealtime();
    useChatStore.getState().reset();
    setAccessToken(null);
    set({ status: 'anonymous', user: null });
  },
}));
