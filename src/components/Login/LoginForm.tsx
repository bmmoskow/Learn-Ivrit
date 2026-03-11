import { LogIn, UserPlus, Mail, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { UseLoginReturn } from "./useLogin";
import { Footer } from "../Footer/Footer";

type LoginFormProps = UseLoginReturn;

export function LoginForm({
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
  switchToSignUp,
  switchToSignIn,
  switchToResetPassword,
}: LoginFormProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetPassword) {
      if (resetStep === "verify") {
        await handleVerifyAndReset();
      } else {
        await handleResetPassword();
      }
    } else if (isSignUp) {
      if (signUpStep === "verify") {
        await handleVerifySignUp();
      } else {
        await handleSignUp();
      }
    } else {
      await handleSignIn();
    }
  };

  const getTitle = () => {
    if (isResetPassword) {
      return resetStep === "verify" ? "Enter Reset Code" : "Reset Password";
    }
    if (isSignUp) {
      return signUpStep === "verify" ? "Verify Your Email" : "Create Account";
    }
    return "Welcome Back";
  };

  const getSubtitle = () => {
    if (isResetPassword) {
      return resetStep === "verify"
        ? "Enter the 6-digit code from your email and choose a new password"
        : "Enter your email to receive a reset code";
    }
    if (isSignUp) {
      return signUpStep === "verify"
        ? "Enter the 6-digit code sent to your email to complete sign up"
        : "Start your Hebrew learning journey";
    }
    return "Sign in to continue learning";
  };

  const isOtpStep = (isResetPassword && resetStep === "verify") || (isSignUp && signUpStep === "verify");
  const showEmailInput = !isOtpStep;
  const showPasswordInput = !isResetPassword && !isOtpStep;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
            <p className="text-gray-600">{getSubtitle()}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && signUpStep === "form" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your name"
                />
              </div>
            )}

            {isSignUp && signUpStep === "form" && (
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                By signing up, you agree to our{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Privacy Policy
                </a>
              </div>
            )}

            {/* Email input — shown for sign in, sign up form, and reset step 'email' */}
            {showEmailInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="your.email@example.com"
                />
              </div>
            )}

            {/* OTP input — shown for both signup verify and reset verify */}
            {isOtpStep && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </div>
            )}

            {/* New Password + Confirm — shown for reset verify only */}
            {isResetPassword && resetStep === "verify" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Confirm new password"
                  />
                </div>
              </>
            )}

            {/* Password — shown for sign in and sign up form only */}
            {showPasswordInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {isResetPassword ? (
                    resetStep === "verify" ? <KeyRound className="w-5 h-5" /> : <Mail className="w-5 h-5" />
                  ) : isSignUp ? (
                    signUpStep === "verify" ? <ShieldCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  {isResetPassword
                    ? resetStep === "verify"
                      ? "Reset Password"
                      : "Send Reset Code"
                    : isSignUp
                      ? signUpStep === "verify"
                        ? "Verify & Sign In"
                        : "Sign Up"
                      : "Sign In"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-2">
            {isResetPassword && (
              <>
                {resetStep === "verify" && (
                  <button
                    onClick={handleResendCode}
                    disabled={loading}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
                <button onClick={switchToSignIn} className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Back to sign in
                </button>
              </>
            )}
            {isSignUp && signUpStep === "verify" && (
              <>
                <button
                  onClick={handleResendSignUpCode}
                  disabled={loading}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Resend code
                </button>
                <button onClick={switchToSignIn} className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Back to sign in
                </button>
              </>
            )}
            {!isResetPassword && !(isSignUp && signUpStep === "verify") && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <button
                  onClick={handleGuestSignIn}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Continue as Guest
                </button>

                <button
                  onClick={isSignUp ? switchToSignIn : switchToSignUp}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium pt-2"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
                <button onClick={switchToResetPassword} className="w-full text-sm text-gray-600 hover:text-gray-700">
                  Forgot password?
                </button>
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
