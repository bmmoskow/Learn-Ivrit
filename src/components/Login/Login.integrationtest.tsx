import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { Login } from './Login';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
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

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('rejects sign-in for a nonexistent user (real auth endpoint)', async () => {
    // testEmail was never registered, so the real Supabase auth endpoint
    // should reject these credentials and return no session. This exercises
    // the live auth round-trip; form-to-auth wiring is covered by the unit tests.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
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
