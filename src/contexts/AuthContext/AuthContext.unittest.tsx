import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import type { Session, User, AuthChangeEvent, AuthTokenResponsePassword, AuthError } from "@supabase/supabase-js";

// Mock the Supabase client
vi.mock("../../../supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn(), id: "test-sub", callback: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

import { supabase } from "../../../supabase/client";

// Typed mock accessors
const mockSignInWithPassword = vi.mocked(supabase.auth.signInWithPassword);
const mockSignUp = vi.mocked(supabase.auth.signUp);
const mockSignOut = vi.mocked(supabase.auth.signOut);
const mockResetPasswordForEmail = vi.mocked(supabase.auth.resetPasswordForEmail);
const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);
const mockFrom = vi.mocked(supabase.from);

// Helper to create mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
  ...overrides,
});

// Helper to create mock session
const createMockSession = (user?: User): Session => ({
  access_token: "mock-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  refresh_token: "mock-refresh",
  user: user ?? createMockUser(),
});

// Helper to create success auth response
const createSuccessAuthResponse = (): AuthTokenResponsePassword => ({
  data: { user: createMockUser(), session: createMockSession() },
  error: null,
});

const createMockAuthError = (message: string, overrides: Partial<AuthError> = {}): AuthError =>
  ({
    name: "AuthError",
    message,
    status: 400,
    code: "test_error",
    ...overrides,
  }) as AuthError;


const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

// Helper to wait for async state updates
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// Custom waitFor helper that triggers React updates (currently unused but kept for potential future use)
// const _waitForCondition = async (callback: () => void, timeout = 1000) => {
//   const start = Date.now();
//   while (Date.now() - start < timeout) {
//     try {
//       callback();
//       return;
//     } catch {
//       await act(async () => {
//         await new Promise(resolve => setTimeout(resolve, 10));
//       });
//     }
//   }
//   callback(); // Final attempt, will throw if still failing
// };

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock env vars so AuthContext doesn't early-return before checking guest mode
    vi.stubEnv("VITE_SUPABASE_URL", "http://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: "test-sub", callback: vi.fn() } },
    } as ReturnType<typeof supabase.auth.onAuthStateChange>);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("initial state", () => {
    it("starts with no user and loading true", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isGuest).toBe(false);
    });

    it("finishes loading after session check", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.loading).toBe(false);
    });

    it("restores guest mode from localStorage", async () => {
      // Create a proper mock for localStorage
      const mockGetItem = vi.fn((key: string) => {
        if (key === "guestMode") return "true";
        return null;
      });

      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, "localStorage", {
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify the mock was called
      expect(mockGetItem).toHaveBeenCalledWith("guestMode");

      // If guest mode was detected, getSession should NOT be called
      expect(supabase.auth.getSession).not.toHaveBeenCalled();
      expect(result.current.isGuest).toBe(true);
      expect(result.current.loading).toBe(false);

      // Restore original localStorage
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it("restores authenticated session", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" } as User;
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } as Session },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("signIn", () => {
    it("calls supabase signInWithPassword", async () => {
      mockSignInWithPassword.mockResolvedValue(createSuccessAuthResponse());

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("immediately updates user state on successful sign-in", async () => {
      const mockUser = createMockUser({ id: "immediate-user", email: "immediate@example.com" });
      const mockSession = createMockSession(mockUser);

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      // User should be null before sign-in
      expect(result.current.user).toBeNull();

      await act(async () => {
        await result.current.signIn("immediate@example.com", "password123");
      });

      // User should be set immediately after sign-in completes
      expect(result.current.user).toEqual(mockUser);
    });

    it("does not update user state when sign-in fails", async () => {
      const authError = createMockAuthError("Invalid credentials", {
        status: 401,
        code: "invalid_credentials",
      });

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.user).toBeNull();

      await act(async () => {
        await result.current.signIn("test@example.com", "wrong");
      });

      // User should still be null after failed sign-in
      expect(result.current.user).toBeNull();
    });

    it("returns error on failure", async () => {
      const authError = createMockAuthError("Invalid credentials", {
        status: 401,
        code: "invalid_credentials",
      });

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      const response = await act(async () => {
        return await result.current.signIn("test@example.com", "wrong");
      });

      expect(response?.error?.message).toEqual(authError.message);
    });

    it("retries on 5xx error", async () => {
      mockSignInWithPassword
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue(createSuccessAuthResponse());

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignInWithPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe("signUp", () => {
    it("calls supabase signUp and creates profile", async () => {
      const mockUser = { id: "user-123", email: "new@example.com" } as User;
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signUp("new@example.com", "password123", "John Doe");
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });

      expect(mockFrom).toHaveBeenCalledWith("profiles");
    });

    it("returns error on failure", async () => {
      const authError = createMockAuthError("Email already exists", {
        status: 400,
        code: "email_exists",
      });

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      const response = await act(async () => {
        return await result.current.signUp("existing@example.com", "password");
      });

      expect(response?.error?.message).toEqual(authError.message);
    });

    it("retries on 5xx error", async () => {
      mockSignUp.mockRejectedValueOnce({ status: 503 }).mockResolvedValue({
        data: { user: { id: "user-123", email: "new@example.com" } as User, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockSignUp).toHaveBeenCalledTimes(2);
    });
  });

  describe("signInAsGuest", () => {
    it("sets guest mode state", async () => {
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

  describe("signOut", () => {
    it("calls supabase signOut for authenticated user", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it("clears guest state for guest user", async () => {
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
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("calls supabase resetPasswordForEmail", async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.resetPassword("reset@example.com");
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("reset@example.com");
    });

    it("returns error on failure", async () => {
      const authError = createMockAuthError("User not found", {
        status: 404,
        code: "user_not_found",
      });

      mockResetPasswordForEmail.mockResolvedValue({
        data: null,
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      const response = await act(async () => {
        return await result.current.resetPassword("unknown@example.com");
      });

      expect(response?.error?.message).toEqual(authError.message);
    });

    it("retries on 5xx error", async () => {
      mockResetPasswordForEmail.mockRejectedValueOnce({ status: 502 }).mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.resetPassword("reset@example.com");
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe("onAuthStateChange", () => {
    it("updates user on SIGNED_IN event", async () => {
      let authCallback: (event: AuthChangeEvent, session: Session | null) => void;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn(), id: "test-sub", callback: vi.fn() } } } as ReturnType<
          typeof supabase.auth.onAuthStateChange
        >;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      const mockUser = { id: "user-456", email: "signed-in@example.com" } as User;

      act(() => {
        authCallback!("SIGNED_IN", { user: mockUser } as Session);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it("clears user on SIGNED_OUT event", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" } as User;
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } as Session },
        error: null,
      });

      let authCallback: (event: AuthChangeEvent, session: Session | null) => void;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn(), id: "test-sub", callback: vi.fn() } } } as ReturnType<
          typeof supabase.auth.onAuthStateChange
        >;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.user).toEqual(mockUser);

      act(() => {
        authCallback!("SIGNED_OUT", null);
      });

      expect(result.current.user).toBeNull();
    });

    it("upserts profile on SIGNED_IN event", async () => {
      let authCallback: (event: AuthChangeEvent, session: Session | null) => void;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn(), id: "test-sub", callback: vi.fn() } } } as ReturnType<
          typeof supabase.auth.onAuthStateChange
        >;
      });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: mockUpsert, insert: vi.fn() } as unknown as ReturnType<typeof supabase.from>);

      renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await flushPromises();
      });

      const mockUser = { id: "user-789", email: "upsert@example.com" } as User;

      await act(async () => {
        authCallback!("SIGNED_IN", { user: mockUser } as Session);
        // Wait for async profile upsert
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-789",
          email: "upsert@example.com",
        }),
        { onConflict: "id" },
      );
    });
  });

  describe("useAuth outside provider", () => {
    it("throws error when used outside AuthProvider", () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");
    });
  });
});
