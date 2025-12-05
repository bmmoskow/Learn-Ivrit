import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { useLogin } from './useLogin';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the Supabase client - the true external boundary
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

// Import the mocked supabase after mocking
import { supabase } from '../../../supabase/client';

// Wrapper to provide AuthContext
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset default mock implementations
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      expect(result.current.email).toBe('');
      expect(result.current.password).toBe('');
      expect(result.current.fullName).toBe('');
      expect(result.current.error).toBe('');
      expect(result.current.message).toBe('');
      expect(result.current.loading).toBe(false);
      expect(result.current.showPassword).toBe(false);
      expect(result.current.isSignUp).toBe(false);
      expect(result.current.isResetPassword).toBe(false);
    });
  });

  describe('handleSignIn', () => {
    it('calls supabase signInWithPassword with email and password', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.current.error).toBe('');
    });

    it('sets error on sign in failure (4xx - no retry)', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        error: { message: 'Invalid credentials', status: 401 },
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('wrong');
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(result.current.error).toBe('Invalid credentials');
      // Should only be called once - no retry for 4xx
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx error then succeeds', async () => {
      (supabase.auth.signInWithPassword as any)
        .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
        .mockResolvedValue({ error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(result.current.error).toBe('');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });

    it('gives up after max retries on persistent 5xx error', async () => {
      (supabase.auth.signInWithPassword as any).mockRejectedValue({
        status: 503,
        message: 'Service Unavailable'
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(result.current.error).toBe('Service Unavailable');
      // 1 initial + 3 retries = 4 calls
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(4);
    });

    it('sets loading state during sign in', async () => {
      let resolveSignIn: (value: any) => void;
      (supabase.auth.signInWithPassword as any).mockImplementation(
        () => new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      let signInPromise: Promise<void>;
      act(() => {
        signInPromise = result.current.handleSignIn();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveSignIn!({ error: null });
        await signInPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('handleSignUp', () => {
    it('calls supabase signUp with email and password', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'new@example.com' } },
        error: null,
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('new@example.com');
        result.current.setPassword('newpassword');
        result.current.setFullName('John Doe');
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpassword',
      });
    });

    it('shows success message and switches to sign in on success', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'new@example.com' } },
        error: null,
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.switchToSignUp();
        result.current.setEmail('new@example.com');
        result.current.setPassword('newpassword');
      });

      expect(result.current.isSignUp).toBe(true);

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.message).toBe('Account created successfully! Please sign in.');
      expect(result.current.isSignUp).toBe(false);
      expect(result.current.password).toBe('');
    });

    it('sets error on sign up failure (4xx - no retry)', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists', status: 400 },
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('existing@example.com');
        result.current.setPassword('password');
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.error).toBe('Email already exists');
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx error then succeeds', async () => {
      (supabase.auth.signUp as any)
        .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
        .mockResolvedValue({
          data: { user: { id: 'user-123', email: 'new@example.com' } },
          error: null,
        });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('new@example.com');
        result.current.setPassword('newpassword');
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.message).toBe('Account created successfully! Please sign in.');
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
    });

    it('sets error for invalid email format', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Unable to validate email address: invalid format', status: 422 },
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('invalid-email');
        result.current.setPassword('password123');
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.error).toBe('Unable to validate email address: invalid format');
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    });

    it('sets error for weak password', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Password should be at least 6 characters', status: 422 },
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('123');
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.error).toBe('Password should be at least 6 characters');
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleResetPassword', () => {
    it('calls supabase resetPasswordForEmail with email', async () => {
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('reset@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('reset@example.com');
    });

    it('shows success message and clears email on success', async () => {
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('reset@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.message).toContain('Password reset link sent');
      expect(result.current.email).toBe('');
    });

    it('sets error on reset password failure (4xx - no retry)', async () => {
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({
        error: { message: 'User not found', status: 404 },
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('nonexistent@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe('User not found');
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx error then succeeds', async () => {
      (supabase.auth.resetPasswordForEmail as any)
        .mockRejectedValueOnce({ status: 502, message: 'Bad Gateway' })
        .mockResolvedValue({ error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('reset@example.com');
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.message).toContain('Password reset link sent');
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleGuestSignIn', () => {
    it('sets guest mode in localStorage', () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.handleGuestSignIn();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('guestMode', 'true');
    });
  });

  describe('resetForm', () => {
    it('clears all form fields and messages', () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password');
        result.current.setFullName('John');
      });

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.email).toBe('');
      expect(result.current.password).toBe('');
      expect(result.current.fullName).toBe('');
      expect(result.current.error).toBe('');
      expect(result.current.message).toBe('');
    });
  });

  describe('mode switching', () => {
    it('switchToSignUp sets isSignUp true and resets form', () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.switchToSignUp();
      });

      expect(result.current.isSignUp).toBe(true);
      expect(result.current.isResetPassword).toBe(false);
      expect(result.current.email).toBe('');
    });

    it('switchToSignIn sets isSignUp false and resets form', () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.switchToSignUp();
        result.current.setEmail('test@example.com');
        result.current.switchToSignIn();
      });

      expect(result.current.isSignUp).toBe(false);
      expect(result.current.isResetPassword).toBe(false);
      expect(result.current.email).toBe('');
    });

    it('switchToResetPassword sets isResetPassword true and resets form', () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.switchToResetPassword();
      });

      expect(result.current.isResetPassword).toBe(true);
      expect(result.current.email).toBe('');
    });
  });
});
