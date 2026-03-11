import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import { retryWithBackoff } from "../../utils/retryWithBackoff/retryWithBackoff";

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
};

export type ResetStep = "email" | "verify";
export type SignUpStep = "form" | "verify";

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
  resetStep: ResetStep;
  signUpStep: SignUpStep;
  otpCode: string;
  confirmPassword: string;
}

export interface UseLoginActions {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setFullName: (fullName: string) => void;
  setShowPassword: (show: boolean) => void;
  setOtpCode: (code: string) => void;
  setConfirmPassword: (password: string) => void;
  handleSignIn: () => Promise<void>;
  handleSignUp: () => Promise<void>;
  handleVerifySignUp: () => Promise<void>;
  handleResendSignUpCode: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleVerifyAndReset: () => Promise<void>;
  handleResendCode: () => Promise<void>;
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
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [signUpStep, setSignUpStep] = useState<SignUpStep>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otpCode, setOtpCode] = useState("");
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
    setConfirmPassword("");
    setFullName("");
    setOtpCode("");
    setResetStep("email");
    setSignUpStep("form");
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
      const { error, data } = await signUp(email, password, fullName);
      if (error) throw error;

      // Supabase returns an empty identities array for repeated signups
      // (user already exists). No email is sent in this case.
      const isRepeatedSignup = data?.user?.identities?.length === 0;

      if (isRepeatedSignup) {
        setError(
          "An account with this email already exists. If you haven't verified it yet, " +
          "please sign in instead, or use a different email."
        );
        return;
      }

      setMessage(
        "A 6-digit verification code has been sent to your email. " +
        "Check your spam/junk folder if you don't see it within a minute."
      );
      setSignUpStep("verify");
      setOtpCode("");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignUp = async () => {
    setError("");
    setMessage("");

    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await retryWithBackoff(() =>
        supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "signup",
        })
      );
      if (verifyError) {
        if (verifyError.message?.toLowerCase().includes("expired") || verifyError.message?.toLowerCase().includes("invalid")) {
          setError("Invalid or expired code. Please request a new one.");
        } else {
          throw verifyError;
        }
        return;
      }

      // Success — user is now verified and logged in.
      // The AuthContext will pick up the session change and redirect to dashboard.
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "");
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("too many")) {
        setError("Too many attempts. Please wait a few minutes before trying again.");
      } else {
        setError(msg || "Failed to verify email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignUpCode = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { error } = await retryWithBackoff(() =>
        supabase.auth.resend({ type: "signup", email })
      );
      if (error) throw error;
      setMessage("A new verification code has been sent to your email. Check your spam/junk folder if it doesn't arrive within a minute.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "");
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("60 seconds") || msg.toLowerCase().includes("too many")) {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setError(msg || "Unable to resend code. Please try again later.");
      }
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
      setMessage("A 6-digit code has been sent to your email. Enter it below along with your new password. Check your spam/junk folder if it doesn't arrive within a minute.");
      setResetStep("verify");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "");
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("60 seconds") || msg.toLowerCase().includes("too many")) {
        setError("Too many reset requests. Please wait a few minutes before trying again.");
      } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no user")) {
        setError("If an account exists with this email, a reset code will be sent.");
      } else {
        setError(msg || "Unable to send reset email. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage("A new code has been sent to your email. Check your spam/junk folder if it doesn't arrive within a minute.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "");
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("60 seconds") || msg.toLowerCase().includes("too many")) {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setError(msg || "Unable to resend code. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    setError("");
    setMessage("");

    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Verify the OTP code (establishes a session)
      const { error: verifyError } = await retryWithBackoff(() =>
        supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "recovery",
        })
      );
      if (verifyError) {
        if (verifyError.message?.toLowerCase().includes("expired") || verifyError.message?.toLowerCase().includes("invalid")) {
          setError("Invalid or expired code. Please request a new one.");
        } else {
          throw verifyError;
        }
        return;
      }

      // Step 2: Update the password (user is now authenticated)
      const { error: updateError } = await retryWithBackoff(() =>
        supabase.auth.updateUser({ password })
      );
      if (updateError) throw updateError;

      // Success — user is now logged in with new password.
      // The AuthContext will pick up the session change and redirect to dashboard.
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "");
      if (msg.toLowerCase().includes("same") || msg.toLowerCase().includes("different")) {
        setError("New password must be different from your current password.");
      } else if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("too many")) {
        setError("Too many attempts. Please wait a few minutes before trying again.");
      } else {
        setError(msg || "Failed to reset password. Please try again.");
      }
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
    resetStep,
    signUpStep,
    otpCode,
    confirmPassword,
    setEmail,
    setPassword,
    setFullName,
    setShowPassword,
    setOtpCode,
    setConfirmPassword,
    handleSignIn,
    handleSignUp,
    handleVerifySignUp,
    handleResendSignUpCode,
    handleResetPassword,
    handleVerifyAndReset,
    handleResendCode,
    handleGuestSignIn,
    resetForm,
    switchToSignUp,
    switchToSignIn,
    switchToResetPassword,
  };
}
