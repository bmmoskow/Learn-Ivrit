import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { useLogin } from "./useLogin";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";
import type { AuthError, User, Session, AuthTokenResponsePassword } from "@supabase/supabase-js";

// Helper to create mock AuthError
const createMockAuthError = (message: string, status: number): AuthError => {
  const error = new Error(message) as AuthError;
  error.status = status;
  error.name = "AuthApiError";
  error.code = "auth_error";
  return error;
};

// Helper to create mock user
const createMockUser = (): User => ({
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
});

// Helper to create mock session
const createMockSession = (): Session => ({
  access_token: "mock-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  refresh_token: "mock-refresh",
  user: createMockUser(),
});

// Helper to create success auth response
const createSuccessAuthResponse = (): AuthTokenResponsePassword => ({
  data: { user: createMockUser(), session: createMockSession() },
  error: null,
});

// Helper for mock subscription
const createMockSubscription = () => ({
  id: "mock-subscription-id",
  callback: vi.fn(),
  unsubscribe: vi.fn(),
});

// Mock the Supabase client - the true external boundary
vi.mock("../../../supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { id: "mock-id", callback: vi.fn(), unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

// Import the mocked supabase after mocking
import { supabase } from "../../../supabase/client";

// Wrapper to provide AuthContext
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("useLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset default mock implementations
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: createMockSubscription() },
    });
  });

  describe("initial state", () => {
    it("has correct initial values", () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      expect(result.current.email).toBe("");
      expect(result.current.password).toBe("");
      expect(result.current.fullName).toBe("");
      expect(result.current.error).toBe("");
      expect(result.current.message).toBe("");
      expect(result.current.loading).toBe(false);
      expect(result.current.showPassword).toBe(false);
      expect(result.current.isSignUp).toBe(false);
      expect(result.current.isResetPassword).toBe(false);
    });
  });

  describe("handleSignIn", () => {
    it("calls supabase signInWithPassword with email and password", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(createSuccessAuthResponse());

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.setPassword("password123");
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.current.error).toBe("");
    });

    it("sets error on sign in failure (4xx - no retry)", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError("Invalid credentials", 401),
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.setPassword("wrong");
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(result.current.error).toBe("Invalid credentials");
      // Should only be called once - no retry for 4xx
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    });

    it("retries on 5xx error then succeeds", async () => {
      vi.mocked(supabase.auth.signInWithPassword)
        .mockRejectedValueOnce({ status: 500, message: "Internal Server Error" })
        .mockResolvedValue(createSuccessAuthResponse());

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.setPassword("password123");
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(result.current.error).toBe("");
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });

    it("gives up after max retries on persistent 5xx error", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue({
        status: 503,
        message: "Service Unavailable",
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.setPassword("password123");
      });

      await act(async () => {
        await result.current.handleSignIn();
      });

      expect(result.current.error).toBe("Service Unavailable");
      // 1 initial + 3 retries = 4 calls
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(4);
    });

    it("sets loading state during sign in", async () => {
      let resolveSignIn: (value: AuthTokenResponsePassword) => void;
      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignIn = resolve;
          }),
      );

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.setPassword("password123");
      });

      let signInPromise: Promise<void>;
      act(() => {
        signInPromise = result.current.handleSignIn();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveSignIn!(createSuccessAuthResponse());
        await signInPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("handleSignUp", () => {
    it("calls supabase signUp with email and password", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: "user-123", email: "new@example.com" } as unknown as null, session: null },
        error: null,
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("new@example.com");
        result.current.setPassword("newpassword");
        result.current.setFullName("John Doe");
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "newpassword",
      });
    });

    it("shows success message and switches to sign in on success", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: "user-123", email: "new@example.com" } as unknown as null, session: null },
        error: null,
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.switchToSignUp();
        result.current.setEmail("new@example.com");
        result.current.setPassword("newpassword");
      });

      expect(result.current.isSignUp).toBe(true);

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.message).toBe("Account created successfully! Please sign in.");
      expect(result.current.isSignUp).toBe(false);
      expect(result.current.password).toBe("");
    });

    it("sets error on sign up failure (4xx - no retry)", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError("Email already exists", 400),
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("existing@example.com");
        result.current.setPassword("password");
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.error).toBe("Email already exists");
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    });

    it("retries on 5xx error then succeeds", async () => {
      vi.mocked(supabase.auth.signUp)
        .mockRejectedValueOnce({ status: 500, message: "Internal Server Error" })
        .mockResolvedValue({
          data: { user: { id: "user-123", email: "new@example.com" } as unknown as null, session: null },
          error: null,
        });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("new@example.com");
        result.current.setPassword("newpassword");
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.message).toBe("Account created successfully! Please sign in.");
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
    });

    it("sets error for invalid email format", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError("Unable to validate email address: invalid format", 422),
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("invalid-email");
        result.current.setPassword("password123");
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.error).toBe("Unable to validate email address: invalid format");
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    });

    it("sets error for weak password", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: createMockAuthError("Password should be at least 6 characters", 422),
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.setPassword("123");
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.error).toBe("Password should be at least 6 characters");
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleResetPassword", () => {
    it("calls supabase resetPasswordForEmail with email", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("reset@example.com");
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("reset@example.com");
    });

    it("shows success message and clears email on success", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("reset@example.com");
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.message).toContain("Password reset link sent");
      expect(result.current.email).toBe("");
    });

    it("sets error on reset password failure (4xx - no retry)", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: null,
        error: createMockAuthError("User not found", 404),
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("nonexistent@example.com");
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.error).toBe("User not found");
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    });

    it("retries on 5xx error then succeeds", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail)
        .mockRejectedValueOnce({ status: 502, message: "Bad Gateway" })
        .mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("reset@example.com");
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.message).toContain("Password reset link sent");
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleGuestSignIn", () => {
    it("sets guest mode in localStorage", () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.handleGuestSignIn();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("guestMode", "true");
    });
  });

  describe("resetForm", () => {
    it("clears all form fields and messages", () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.setPassword("password");
        result.current.setFullName("John");
      });

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.email).toBe("");
      expect(result.current.password).toBe("");
      expect(result.current.fullName).toBe("");
      expect(result.current.error).toBe("");
      expect(result.current.message).toBe("");
    });
  });

  describe("mode switching", () => {
    it("switchToSignUp sets isSignUp true and resets form", () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.switchToSignUp();
      });

      expect(result.current.isSignUp).toBe(true);
      expect(result.current.isResetPassword).toBe(false);
      expect(result.current.email).toBe("");
    });

    it("switchToSignIn sets isSignUp false and resets form", () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.switchToSignUp();
        result.current.setEmail("test@example.com");
        result.current.switchToSignIn();
      });

      expect(result.current.isSignUp).toBe(false);
      expect(result.current.isResetPassword).toBe(false);
      expect(result.current.email).toBe("");
    });

    it("switchToResetPassword sets isResetPassword true and resets form", () => {
      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("test@example.com");
        result.current.switchToResetPassword();
      });

      expect(result.current.isResetPassword).toBe(true);
      expect(result.current.email).toBe("");
    });
  });
});
