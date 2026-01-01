import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { AuthError, UserResponse } from "@supabase/supabase-js";
import { useResetPassword } from "./useResetPassword";

// Mock the Supabase client
vi.mock("../../../../supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

// Import the mocked supabase after mocking
import { supabase } from "../../../../supabase/client";

// Helper to create success response
const createSuccessResponse = (): UserResponse => ({
  data: { user: null },
  error: null,
});

// Helper to create error response
const createErrorResponse = (message: string, status = 400, code = "error"): UserResponse => ({
  data: { user: null },
  error: { message, name: "AuthError", status, code } as AuthError,
});

describe("useResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location.hash
    window.location.hash = "";
  });

  describe("initial state", () => {
    it("has correct initial values", () => {
      const { result } = renderHook(() => useResetPassword());

      expect(result.current.password).toBe("");
      expect(result.current.confirmPassword).toBe("");
      expect(result.current.error).toBe("");
      expect(result.current.loading).toBe(false);
      expect(result.current.showPassword).toBe(false);
      expect(result.current.showConfirmPassword).toBe(false);
    });
  });

  describe("state setters", () => {
    it("setPassword updates password", () => {
      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("newpassword123");
      });

      expect(result.current.password).toBe("newpassword123");
    });

    it("setConfirmPassword updates confirmPassword", () => {
      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setConfirmPassword("newpassword123");
      });

      expect(result.current.confirmPassword).toBe("newpassword123");
    });

    it("toggleShowPassword toggles showPassword", () => {
      const { result } = renderHook(() => useResetPassword());

      expect(result.current.showPassword).toBe(false);

      act(() => {
        result.current.toggleShowPassword();
      });

      expect(result.current.showPassword).toBe(true);

      act(() => {
        result.current.toggleShowPassword();
      });

      expect(result.current.showPassword).toBe(false);
    });

    it("toggleShowConfirmPassword toggles showConfirmPassword", () => {
      const { result } = renderHook(() => useResetPassword());

      expect(result.current.showConfirmPassword).toBe(false);

      act(() => {
        result.current.toggleShowConfirmPassword();
      });

      expect(result.current.showConfirmPassword).toBe(true);
    });
  });

  describe("handleSubmit validation", () => {
    it("sets error when passwords do not match", async () => {
      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("password123");
        result.current.setConfirmPassword("different123");
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Passwords do not match");
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("sets error when password is too short", async () => {
      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("12345");
        result.current.setConfirmPassword("12345");
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Password must be at least 6 characters");
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("handleSubmit success", () => {
    it("calls supabase updateUser with password and returns true on success", async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue(createSuccessResponse());

      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("newpassword123");
        result.current.setConfirmPassword("newpassword123");
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      });
      expect(success!).toBe(true);
      expect(result.current.error).toBe("");
      expect(window.location.hash).toBe("");
    });

    it("clears window.location.hash on success", async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue(createSuccessResponse());
      window.location.hash = "reset-password";

      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("newpassword123");
        result.current.setConfirmPassword("newpassword123");
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(window.location.hash).toBe("");
    });
  });

  describe("handleSubmit failure", () => {
    it("sets error on supabase error and returns false", async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue(
        createErrorResponse("Password is too weak", 400, "weak_password"),
      );

      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("newpassword123");
        result.current.setConfirmPassword("newpassword123");
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Password is too weak");
    });

    it("sets default error message on unknown error", async () => {
      vi.mocked(supabase.auth.updateUser).mockRejectedValue({});

      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("newpassword123");
        result.current.setConfirmPassword("newpassword123");
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Failed to update password");
    });
  });

  describe("loading state", () => {
    it("sets loading state during submit", async () => {
      let resolveUpdate: ((value: UserResponse) => void) | undefined;
      vi.mocked(supabase.auth.updateUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          }),
      );

      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("newpassword123");
        result.current.setConfirmPassword("newpassword123");
      });

      let submitPromise: Promise<boolean>;
      act(() => {
        submitPromise = result.current.handleSubmit();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveUpdate!(createSuccessResponse());
        await submitPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it("clears loading state on error", async () => {
      vi.mocked(supabase.auth.updateUser).mockRejectedValue({ message: "Error" });

      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("newpassword123");
        result.current.setConfirmPassword("newpassword123");
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("resetForm", () => {
    it("clears all form fields and state", () => {
      const { result } = renderHook(() => useResetPassword());

      act(() => {
        result.current.setPassword("password123");
        result.current.setConfirmPassword("password123");
        result.current.toggleShowPassword();
        result.current.toggleShowConfirmPassword();
      });

      expect(result.current.password).toBe("password123");
      expect(result.current.showPassword).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.password).toBe("");
      expect(result.current.confirmPassword).toBe("");
      expect(result.current.error).toBe("");
      expect(result.current.showPassword).toBe(false);
      expect(result.current.showConfirmPassword).toBe(false);
    });
  });
});
