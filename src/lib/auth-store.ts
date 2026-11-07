import { create } from 'zustand';
import { User } from './db/db';

const DEFAULT_ADMIN: User = {
  id: 'usr-1',
  username: 'admin',
  pin: '1234',
  role: 'Admin',
  created_at: new Date().toISOString(),
};

interface AuthState {
  user: User;
  isAuthenticated: boolean;
  loginWithPin: (username: string, pin: string) => User;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: DEFAULT_ADMIN,
  isAuthenticated: true,

  loginWithPin: () => {
    set({ user: DEFAULT_ADMIN, isAuthenticated: true });
    return DEFAULT_ADMIN;
  },

  logout: () => {
    // Keep user as admin
    set({ user: DEFAULT_ADMIN, isAuthenticated: true });
  },

  initializeAuth: () => {
    set({ user: DEFAULT_ADMIN, isAuthenticated: true });
  },
}));
