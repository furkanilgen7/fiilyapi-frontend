import BrandPanel from "./BrandPanel";
import LoginForm from "./LoginForm";
import "./login.css";

export default function LoginPage() {
  return (
    <main className="login">
      <BrandPanel />
      <div className="login-form-panel">
        <div className="login-form">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
