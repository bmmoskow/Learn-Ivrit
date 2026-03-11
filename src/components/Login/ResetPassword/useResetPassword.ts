import { useState } from "react";
import { supabase } from "../../../../supabase/client";

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
};

export type UseResetPasswordState = {
  password: string;
  confirmPassword: string;
  error: string;
  loading: boolean;
  success: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
};

export type UseResetPasswordActions = {
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  toggleShowPassword: () => void;
  toggleShowConfirmPassword: () => void;
  handleSubmit: () => Promise<boolean>;
  resetForm: () => void;
};

export type UseResetPasswordReturn = UseResetPasswordState & UseResetPasswordActions;

export function useResetPassword(): UseResetPasswordReturn {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (): Promise<boolean> => {
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      window.location.hash = "";
      return true;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "");
      if (msg.toLowerCase().includes("same") || msg.toLowerCase().includes("different")) {
        setError("New password must be different from your current password.");
      } else if (msg.toLowerCase().includes("weak") || msg.toLowerCase().includes("strength")) {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (msg.toLowerCase().includes("session") || msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
        setError("Your reset link has expired. Please request a new password reset from the login screen.");
      } else if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("too many")) {
        setError("Too many attempts. Please wait a few minutes before trying again.");
      } else {
        setError(msg || "Failed to update password. Please try again.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    password,
    confirmPassword,
    error,
    loading,
    success,
    showPassword,
    showConfirmPassword,
    setPassword,
    setConfirmPassword,
    toggleShowPassword,
    toggleShowConfirmPassword,
    handleSubmit,
    resetForm,
  };
}
