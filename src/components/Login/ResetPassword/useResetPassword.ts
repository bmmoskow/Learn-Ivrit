import { useState } from "react";
import { supabase } from "../../../../supabase/client";

export type UseResetPasswordState = {
  password: string;
  confirmPassword: string;
  error: string;
  loading: boolean;
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
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

      window.location.hash = "";
      return true;
    } catch (err: unknown) {
      setError(err.message || "Failed to update password");
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
