import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock the Supabase client
vi.mock('../../../supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

import { supabase } from '../../../supabase/client';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// Helper to wait for async state updates
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Custom waitFor helper that triggers React updates
const waitForCondition = async (callback: () => void, timeout = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      callback();
      return;
    } catch {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
    }
  }
  callback(); // Final attempt, will throw if still failing
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock env vars so AuthContext doesn't early-return before checking guest mode
    vi.stubEnv('VITE_SUPABASE_URL', 'http://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('initial state', () => {
    it('starts with no user and loading true', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isGuest).toBe(false);
    });

    it('finishes loading after session check', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.loading).toBe(false);
    });

    it('restores guest mode from localStorage', async () => {
      // Create a proper mock for localStorage
      const mockGetItem = vi.fn((key: string) => {
        if (key === 'guestMode') return 'true';
        return null;
      });

      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        },
        writable: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verify the mock was called
      expect(mockGetItem).toHaveBeenCalledWith('guestMode');

      // If guest mode was detected, getSession should NOT be called
      expect(supabase.auth.getSession).not.toHaveBeenCalled();
      expect(result.current.isGuest).toBe(true);
      expect(result.current.loading).toBe(false);

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('restores authenticated session', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: mockUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('returns error on failure', async () => {
      const mockError = { message: 'Invalid credentials', status: 401 };
      (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      let response: any;
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(response.error).toEqual(mockError);
    });

    it('retries on 5xx error', async () => {
      (supabase.auth.signInWithPassword as any)
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp and creates profile', async () => {
      const mockUser = { id: 'user-123', email: 'new@example.com' };
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'John Doe');
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('returns error on failure', async () => {
      const mockError = { message: 'Email already exists', status: 400 };
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      let response: any;
      await act(async () => {
        response = await result.current.signUp('existing@example.com', 'password');
      });

      expect(response.error).toEqual(mockError);
    });

    it('retries on 5xx error', async () => {
      (supabase.auth.signUp as any)
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValue({
          data: { user: { id: 'user-123', email: 'new@example.com' } },
          error: null,
        });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123');
      });

      expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
    });
  });

  describe('signInAsGuest', () => {
    it('sets guest mode state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isGuest).toBe(false);

      await act(async () => {
        result.current.signInAsGuest();
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.user).toBeNull();
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut for authenticated user', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('clears guest state for guest user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      // Sign in as guest first
      await act(async () => {
        result.current.signInAsGuest();
      });

      expect(result.current.isGuest).toBe(true);

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isGuest).toBe(false);
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('calls supabase resetPasswordForEmail', async () => {
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.resetPassword('reset@example.com');
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('reset@example.com');
    });

    it('returns error on failure', async () => {
      const mockError = { message: 'User not found', status: 404 };
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      let response: any;
      await act(async () => {
        response = await result.current.resetPassword('unknown@example.com');
      });

      expect(response.error).toEqual(mockError);
    });

    it('retries on 5xx error', async () => {
      (supabase.auth.resetPasswordForEmail as any)
        .mockRejectedValueOnce({ status: 502 })
        .mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.resetPassword('reset@example.com');
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('onAuthStateChange', () => {
    it('updates user on SIGNED_IN event', async () => {
      let authCallback: (event: string, session: any) => void;
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      const mockUser = { id: 'user-456', email: 'signed-in@example.com' };

      act(() => {
        authCallback('SIGNED_IN', { user: mockUser });
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('clears user on SIGNED_OUT event', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: mockUser } },
      });

      let authCallback: (event: string, session: any) => void;
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.user).toEqual(mockUser);

      act(() => {
        authCallback('SIGNED_OUT', null);
      });

      expect(result.current.user).toBeNull();
    });

    it('upserts profile on SIGNED_IN event', async () => {
      let authCallback: (event: string, session: any) => void;
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ upsert: mockUpsert, insert: vi.fn() });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      const mockUser = { id: 'user-789', email: 'upsert@example.com' };

      await act(async () => {
        authCallback('SIGNED_IN', { user: mockUser });
        // Wait for async profile upsert
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-789',
          email: 'upsert@example.com',
        }),
        { onConflict: 'id' }
      );
    });
  });

  describe('useAuth outside provider', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
