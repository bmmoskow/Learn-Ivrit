import { useEffect } from "react";

interface ResetPasswordProps {
  onComplete: () => void;
}

/**
 * Legacy /reset-password route.
 * Password reset now uses OTP code entry on the login screen.
 * This component redirects users back to the login page.
 */
export function ResetPassword({ onComplete }: ResetPasswordProps) {
  useEffect(() => {
    // Redirect to login — the OTP flow handles everything there
    onComplete();
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
