import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { uniqueEmail, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';
// AuthContext drives the root `supabase/client`; import it to assert the real
// session state it produces. (See useVocabularyList.integrationtest.tsx for the
// two-client note.)
import { supabase } from '../../../supabase/client';

// REAL-backend integration test for the auth layer exercised through the actual
// AuthContext (priority 5): sign-up against the live auth endpoint producing a
// real session/user, guest mode, and sign-out. This goes beyond the shallow
// Login suite by driving the context's own methods and asserting the session
// they create. Identities come from the shared helper's `uniqueEmail` (so runs
// never collide) and teardown goes through `cleanupTestUser`.
describe('AuthContext auth flows (real backend)', () => {
  // Tracks a user created via the context so afterEach can tear it down.
  let createdUserId: string | undefined;

  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(async () => {
    createdUserId = undefined;
    // Start every test from a clean, logged-out slate.
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('guestMode');
    } catch {
      /* storage unavailable — ignore */
    }
  });

  afterEach(async () => {
    // Scoped teardown of any user the test created (helper deletes the auth user
    // when a service-role key is configured; otherwise it leaves the harmless,
    // uniquely-named user per its documented fallback).
    await cleanupTestUser(createdUserId);
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('guestMode');
    } catch {
      /* ignore */
    }
  });

  it('signs up a new user via the context and exposes a real session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const email = uniqueEmail('authctx');

    await act(async () => {
      const res = await result.current.signUp(email, TEST_USER_PASSWORD, 'Test Person');
      expect(res.error).toBeNull();
      createdUserId = res.data?.user?.id;
    });

    expect(createdUserId).toBeTruthy();

    // The context surfaces the signed-in user (via onAuthStateChange), and the
    // underlying client holds a real session for that user.
    await waitFor(() => expect(result.current.user?.email).toBe(email));
    expect(result.current.isGuest).toBe(false);

    const { data } = await supabase.auth.getSession();
    expect(data.session).not.toBeNull();
    expect(data.session?.user.id).toBe(createdUserId);
  });

  it('enters and leaves guest mode without a session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.signInAsGuest();
    });
    expect(result.current.isGuest).toBe(true);
    expect(result.current.user).toBeNull();

    // Guest mode is purely local — no real auth session is created.
    const { data: guestSession } = await supabase.auth.getSession();
    expect(guestSession.session).toBeNull();

    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.isGuest).toBe(false);
  });

  it('signs out a signed-in user and clears the session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const email = uniqueEmail('authctx-out');
    await act(async () => {
      const res = await result.current.signUp(email, TEST_USER_PASSWORD);
      expect(res.error).toBeNull();
      createdUserId = res.data?.user?.id;
    });
    await waitFor(() => expect(result.current.user?.email).toBe(email));

    await act(async () => {
      await result.current.signOut();
    });

    await waitFor(() => expect(result.current.user).toBeNull());
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });
});
