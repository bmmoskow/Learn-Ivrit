import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Integration Tests', () => {
  let testEmail: string;
  let testPassword: string;

  beforeEach(() => {
    mockNavigate.mockClear();
    testEmail = `test-${Date.now()}@example.com`;
    testPassword = 'TestPassword123!';
  });

  afterEach(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  it('should render login form', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Hebrew Learning Assistant/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('should interact with Supabase auth on login attempt', async () => {
    const signInSpy = vi.spyOn(supabase.auth, 'signInWithPassword');

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    emailInput.setAttribute('value', testEmail);
    passwordInput.setAttribute('value', testPassword);

    await waitFor(() => {
      expect(signInSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    signInSpy.mockRestore();
  });

  it('should verify Supabase connection is available', async () => {
    const { data, error } = await supabase.auth.getSession();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.session).toBeDefined();
  });

  it('should handle sign out correctly', async () => {
    const { error } = await supabase.auth.signOut();

    expect(error).toBeNull();

    const { data: { session } } = await supabase.auth.getSession();
    expect(session).toBeNull();
  });
});
