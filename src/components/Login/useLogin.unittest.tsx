import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { useLogin } from "./useLogin";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";
import type { AuthError, AuthResponse, User, Session, AuthTokenResponsePassword } from "@supabase/supabase-js";

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
      verifyOtp: vi.fn(),
      resend: vi.fn(),
      updateUser: vi.fn(),
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
        data: { user: { id: "user-123", email: "new@example.com", identities: [{ id: "id-1" }] } as unknown as User, session: null },
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
        options: { data: { full_name: "John Doe" } },
      });
    });

    it("shows verification message and transitions to verify step on success", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: "user-123", email: "new@example.com", identities: [{ id: "id-1" }] } as unknown as User, session: null },
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

      expect(result.current.message).toContain("verification code");
      expect(result.current.signUpStep).toBe("verify");
      expect(result.current.isSignUp).toBe(true);
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
          data: { user: { id: "user-123", email: "new@example.com", identities: [{ id: "id-1" }] } as unknown as User, session: null },
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

      expect(result.current.message).toContain("verification code");
      expect(result.current.signUpStep).toBe("verify");
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

    it("detects repeated signup (existing account) and shows error", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: "user-123", email: "existing@example.com", identities: [] } as unknown as User, session: null },
        error: null,
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.switchToSignUp();
        result.current.setEmail("existing@example.com");
        result.current.setPassword("password123");
      });

      await act(async () => {
        await result.current.handleSignUp();
      });

      expect(result.current.error).toContain("already exists");
      expect(result.current.signUpStep).toBe("form");
      expect(result.current.message).toBe("");
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

    it("shows success message and transitions to verify step on success", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useLogin(), { wrapper });

      act(() => {
        result.current.setEmail("reset@example.com");
      });

      await act(async () => {
        await result.current.handleResetPassword();
      });

      expect(result.current.message).toContain("6-digit code");
      expect(result.current.resetStep).toBe("verify");
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

      expect(result.current.error).toContain("account exists");
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

      expect(result.current.message).toContain("6-digit code");
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

  describe("OTP signup verification flow", () => {
    describe("initial signup OTP state", () => {
      it("has correct initial signUpStep value", () => {
        const { result } = renderHook(() => useLogin(), { wrapper });
        expect(result.current.signUpStep).toBe("form");
      });
    });

    describe("handleVerifySignUp", () => {
      it("validates OTP code is 6 digits", async () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setOtpCode("123");
        });

        await act(async () => {
          await result.current.handleVerifySignUp();
        });

        expect(result.current.error).toContain("6-digit code");
        expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
      });

      it("validates empty OTP code", async () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        await act(async () => {
          await result.current.handleVerifySignUp();
        });

        expect(result.current.error).toContain("6-digit code");
      });

      it("calls verifyOtp with signup type on valid input", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: createMockUser(), session: createMockSession() },
          error: null,
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("new@example.com");
          result.current.setOtpCode("123456");
        });

        await act(async () => {
          await result.current.handleVerifySignUp();
        });

        expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
          email: "new@example.com",
          token: "123456",
          type: "signup",
        });
        expect(result.current.error).toBe("");
      });

      it("shows error for expired signup OTP code", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: null, session: null },
          error: createMockAuthError("Token has expired", 400),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("new@example.com");
          result.current.setOtpCode("123456");
        });

        await act(async () => {
          await result.current.handleVerifySignUp();
        });

        expect(result.current.error).toContain("expired");
      });

      it("shows error for invalid signup OTP code", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: null, session: null },
          error: createMockAuthError("Token is invalid", 400),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("new@example.com");
          result.current.setOtpCode("000000");
        });

        await act(async () => {
          await result.current.handleVerifySignUp();
        });

        expect(result.current.error).toContain("Invalid or expired");
      });

      it("shows rate limit error on too many attempts", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockRejectedValue(
          new Error("Too many requests"),
        );

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("new@example.com");
          result.current.setOtpCode("123456");
        });

        await act(async () => {
          await result.current.handleVerifySignUp();
        });

        expect(result.current.error).toContain("Too many attempts");
      });
    });

    describe("handleResendSignUpCode", () => {
      it("calls supabase.auth.resend with signup type", async () => {
        vi.mocked(supabase.auth.resend).mockResolvedValue({ data: { messageId: "123" }, error: null } as never);

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("new@example.com");
        });

        await act(async () => {
          await result.current.handleResendSignUpCode();
        });

        expect(supabase.auth.resend).toHaveBeenCalledWith({ type: "signup", email: "new@example.com" });
        expect(result.current.message).toContain("new verification code");
      });

      it("shows rate limit error on resend", async () => {
        vi.mocked(supabase.auth.resend).mockResolvedValue({
          data: { user: null, session: null },
          error: createMockAuthError("For security purposes, you can only request this after 60 seconds", 429),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("new@example.com");
        });

        await act(async () => {
          await result.current.handleResendSignUpCode();
        });

        expect(result.current.error).toContain("Too many requests");
      });
    });

    describe("resetForm clears signup OTP state", () => {
      it("clears OTP code and resets signUpStep", () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setOtpCode("123456");
        });

        act(() => {
          result.current.resetForm();
        });

        expect(result.current.otpCode).toBe("");
        expect(result.current.signUpStep).toBe("form");
      });
    });
  });

  describe("OTP password reset flow", () => {
    describe("initial OTP state", () => {
      it("has correct initial OTP-related values", () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        expect(result.current.resetStep).toBe("email");
        expect(result.current.otpCode).toBe("");
        expect(result.current.confirmPassword).toBe("");
      });
    });

    describe("handleVerifyAndReset", () => {
      it("validates OTP code is 6 digits", async () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setOtpCode("123");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("6-digit code");
        expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
      });

      it("validates empty OTP code", async () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("6-digit code");
      });

      it("validates password minimum length", async () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setOtpCode("123456");
          result.current.setPassword("short");
          result.current.setConfirmPassword("short");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("at least 6 characters");
        expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
      });

      it("validates passwords match", async () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setOtpCode("123456");
          result.current.setPassword("password123");
          result.current.setConfirmPassword("different123");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("do not match");
        expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
      });

      it("calls verifyOtp then updateUser on valid input", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: createMockUser(), session: createMockSession() },
          error: null,
        });
        vi.mocked(supabase.auth.updateUser).mockResolvedValue({
          data: { user: createMockUser() },
          error: null,
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
          result.current.setOtpCode("123456");
          result.current.setPassword("newpassword123");
          result.current.setConfirmPassword("newpassword123");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
          email: "reset@example.com",
          token: "123456",
          type: "recovery",
        });
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
          password: "newpassword123",
        });
        expect(result.current.error).toBe("");
      });

      it("shows error for expired OTP code", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: null, session: null },
          error: createMockAuthError("Token has expired", 400),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
          result.current.setOtpCode("123456");
          result.current.setPassword("newpassword123");
          result.current.setConfirmPassword("newpassword123");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("expired");
        expect(supabase.auth.updateUser).not.toHaveBeenCalled();
      });

      it("shows error for invalid OTP code", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: null, session: null },
          error: createMockAuthError("Token is invalid", 400),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
          result.current.setOtpCode("000000");
          result.current.setPassword("newpassword123");
          result.current.setConfirmPassword("newpassword123");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("Invalid or expired");
        expect(supabase.auth.updateUser).not.toHaveBeenCalled();
      });

      it("shows error when new password is same as current", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: createMockUser(), session: createMockSession() },
          error: null,
        });
        vi.mocked(supabase.auth.updateUser).mockResolvedValue({
          data: { user: null },
          error: createMockAuthError("New password must be different", 422),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
          result.current.setOtpCode("123456");
          result.current.setPassword("samepassword");
          result.current.setConfirmPassword("samepassword");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("different");
      });

      it("shows rate limit error on too many attempts", async () => {
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: null, session: null },
          error: createMockAuthError("Too many requests", 429),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
          result.current.setOtpCode("123456");
          result.current.setPassword("newpassword123");
          result.current.setConfirmPassword("newpassword123");
        });

        await act(async () => {
          await result.current.handleVerifyAndReset();
        });

        expect(result.current.error).toContain("Too many attempts");
      });

      it("sets loading state during verification", async () => {
        let resolveVerify!: (value: AuthResponse | PromiseLike<AuthResponse>) => void;
        vi.mocked(supabase.auth.verifyOtp).mockImplementation(
          () => new Promise<AuthResponse>((resolve) => { resolveVerify = resolve; }),
        );

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
          result.current.setOtpCode("123456");
          result.current.setPassword("newpassword123");
          result.current.setConfirmPassword("newpassword123");
        });

        let verifyPromise: Promise<void>;
        act(() => {
          verifyPromise = result.current.handleVerifyAndReset();
        });

        expect(result.current.loading).toBe(true);

        await act(async () => {
          resolveVerify!({
            data: { user: createMockUser(), session: createMockSession() },
            error: null,
          });
          // Also mock updateUser for the second step
          vi.mocked(supabase.auth.updateUser).mockResolvedValue({
            data: { user: createMockUser() },
            error: null,
          });
          await verifyPromise;
        });

        expect(result.current.loading).toBe(false);
      });
    });

    describe("handleResendCode", () => {
      it("calls resetPasswordForEmail to resend OTP", async () => {
        vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
        });

        await act(async () => {
          await result.current.handleResendCode();
        });

        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("reset@example.com");
        expect(result.current.message).toContain("new code");
      });

      it("shows rate limit error on resend", async () => {
        vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
          data: null,
          error: createMockAuthError("For security purposes, you can only request this after 60 seconds", 429),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
        });

        await act(async () => {
          await result.current.handleResendCode();
        });

        expect(result.current.error).toContain("Too many requests");
      });
    });

    describe("handleResetPassword rate limiting", () => {
      it("shows rate limit error when too many reset requests", async () => {
        vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
          data: null,
          error: createMockAuthError("For security purposes, you can only request this after 60 seconds", 429),
        });

        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setEmail("reset@example.com");
        });

        await act(async () => {
          await result.current.handleResetPassword();
        });

        expect(result.current.error).toContain("Too many reset requests");
      });
    });

    describe("resetForm clears OTP state", () => {
      it("clears OTP code, confirm password, and resets step", () => {
        const { result } = renderHook(() => useLogin(), { wrapper });

        act(() => {
          result.current.setOtpCode("123456");
          result.current.setConfirmPassword("password");
        });

        act(() => {
          result.current.resetForm();
        });

        expect(result.current.otpCode).toBe("");
        expect(result.current.confirmPassword).toBe("");
        expect(result.current.resetStep).toBe("email");
      });
    });
  });
});
