import { useLogin } from "./useLogin";
import { LoginForm } from "./LoginForm";

export function Login() {
  const loginState = useLogin();
  return <LoginForm {...loginState} />;
}
