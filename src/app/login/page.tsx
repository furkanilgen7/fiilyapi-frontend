import { Suspense } from "react";
import BrandPanel from "./BrandPanel";
import LoginForm from "./LoginForm";
import "./login.css";

export default function LoginPage() {
  return (
    <main className="login">
      <BrandPanel />
      <div className="login-form-panel">
        <div className="login-form">
          {/* useSearchParams prerender sinirlamasi: Next.js 15'te bu hooku kullanan */}
          {/* bilesenler Suspense siniri icinde olmali, aksi halde build hata verir */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
