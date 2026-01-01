import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
};

export interface UseLoginState {
  email: string;
  password: string;
  fullName: string;
  error: string;
  message: string;
  loading: boolean;
  showPassword: boolean;
  isSignUp: boolean;
  isResetPassword: boolean;
}

export interface UseLoginActions {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setFullName: (fullName: string) => void;
  setShowPassword: (show: boolean) => void;
  handleSignIn: () => Promise<void>;
  handleSignUp: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleGuestSignIn: () => void;
  resetForm: () => void;
  switchToSignUp: () => void;
  switchToSignIn: () => void;
  switchToResetPassword: () => void;
}

export type UseLoginReturn = UseLoginState & UseLoginActions;

export function useLogin(): UseLoginReturn {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp, signInAsGuest, resetPassword } = useAuth();

  const resetForm = () => {
    setError("");
    setMessage("");
    setEmail("");
    setPassword("");
    setFullName("");
  };

  const handleSignIn = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) throw error;
      setMessage("Account created successfully! Please sign in.");
      setIsSignUp(false);
      setPassword("");
      setFullName("");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage("Password reset link sent to your email. Click the link in the email to reset your password.");
      setEmail("");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    signInAsGuest();
  };

  const switchToSignUp = () => {
    setIsSignUp(true);
    setIsResetPassword(false);
    resetForm();
  };

  const switchToSignIn = () => {
    setIsSignUp(false);
    setIsResetPassword(false);
    resetForm();
  };

  const switchToResetPassword = () => {
    setIsResetPassword(true);
    resetForm();
  };

  return {
    email,
    password,
    fullName,
    error,
    message,
    loading,
    showPassword,
    isSignUp,
    isResetPassword,
    setEmail,
    setPassword,
    setFullName,
    setShowPassword,
    handleSignIn,
    handleSignUp,
    handleResetPassword,
    handleGuestSignIn,
    resetForm,
    switchToSignUp,
    switchToSignIn,
    switchToResetPassword,
  };
}
