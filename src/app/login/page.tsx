import BrandPanel from "./BrandPanel";
import "./login.css";

export default function LoginPage() {
  return (
    <main className="login">
      <BrandPanel />
      <div className="login-form-panel">
        <div className="login-form">{/* LoginForm Task 10'da eklenir */}</div>
      </div>
    </main>
  );
}
