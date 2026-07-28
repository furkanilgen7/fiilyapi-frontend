"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Checkbox, Field, Input } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import DemoAccounts from "./DemoAccounts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Acik-yonlendirme korkulugu: yalnizca ayni-kaynak ic yol kabul edilir.
export function isSafeInternalPath(next: string | null): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.startsWith("/\\")) return false;
  return true;
}

// Backend statu kodunu kullanici-dostu jenerik mesaja esler (alan sizdirmadan).
function messageForStatus(status: number | "network"): string {
  if (status === 401) return "E-posta veya şifre hatalı.";
  if (status === 403) return "Hesabınız aktif değil. Yöneticinizle iletişime geçin.";
  if (status === 422 || status === 400) return "Girdiğiniz bilgileri kontrol edin.";
  return "Sunucuya ulaşılamıyor. Lütfen tekrar deneyin.";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDev = process.env.NODE_ENV === "development";

  function validate(): boolean {
    let ok = true;
    if (email.trim() === "") {
      setEmailError("E-posta gerekli.");
      ok = false;
    } else if (!EMAIL_RE.test(email)) {
      setEmailError("Geçerli bir e-posta girin.");
      ok = false;
    } else {
      setEmailError(null);
    }
    if (password === "") {
      setPasswordError("Şifre gerekli.");
      ok = false;
    } else {
      setPasswordError(null);
    }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      if (res.ok) {
        const next = searchParams.get("next");
        router.push(isSafeInternalPath(next) ? next : "/");
        return;
      }
      setFormError(messageForStatus(res.status));
    } catch {
      setFormError(messageForStatus("network"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="login-heading">
        <h1>Hesabınıza giriş yapın</h1>
        <p>FİİL Yapı ERP sistemine hoş geldiniz</p>
      </div>

      {formError && (
        <Alert variant="danger" className="login-alert">{formError}</Alert>
      )}

      {/* Giriş etiketleri 13px: mockup Giriş.dc.html bilinçli istisnası (size="lg"). */}
      <Field
        label="E-posta Adresi"
        required
        size="lg"
        className="login-field"
        error={emailError}
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            placeholder="ornek@sirket.com"
            value={email}
            status={emailError ? "error" : "default"}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <Field
        label="Şifre"
        required
        size="lg"
        className="login-field"
        error={passwordError}
        /* Mockup'ta "Şifremi unuttum" bağlantısı var; şifre sıfırlama akışı henüz
           yok, bu yüzden görsel olarak birebir ama tıklanabilir değil. */
        labelAside={<span className="login-field__link">Şifremi unuttum</span>}
      >
        {(control) => (
          <Input
            {...control}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Şifrenizi girin"
            value={password}
            status={passwordError ? "error" : "default"}
            onChange={(e) => setPassword(e.target.value)}
            rightIcon={
              <button
                type="button"
                className="login-password-toggle"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />
        )}
      </Field>

      <Checkbox
        label="30 gün boyunca beni hatırla"
        checked={remember}
        onChange={(e) => setRemember(e.target.checked)}
      />

      <Button type="submit" variant="primary" className="login-submit" disabled={isSubmitting}>
        {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
      </Button>

      <div className="login-footer">
        Hesabınız yok mu? <strong>Yöneticinizle iletişime geçin</strong>
      </div>

      {isDev && <DemoAccounts onPick={setEmail} />}
    </form>
  );
}
