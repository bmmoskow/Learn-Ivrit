import { useResetPassword } from "./useResetPassword";
import { ResetPasswordForm } from "./ResetPasswordForm";

interface ResetPasswordProps {
  onComplete: () => void;
}

export function ResetPassword({ onComplete }: ResetPasswordProps) {
  const state = useResetPassword();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await state.handleSubmit();
    if (success) {
      onComplete();
    }
  };

  return <ResetPasswordForm state={state} onSubmit={handleFormSubmit} />;
}
