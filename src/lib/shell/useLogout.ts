"use client";

import { useRouter } from "next/navigation";

/**
 * Oturumu kapatır: backend logout endpoint'ini çağırır ve /login'e yönlendirir.
 * Ayarlar sidebar/breadcrumb gibi birden fazla yerde tekrarlanan çıkış mantığını
 * tek noktadan sağlar.
 */
export function useLogout(): () => Promise<void> {
  const router = useRouter();

  return async function logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
}
