"use client";

import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";

/**
 * Oturumu kapatır: BFF çıkış ucunu çağırır ve /login'e yönlendirir. Sunucu-taraflı
 * iptali (token_version) BFF kendi içinde backend'e ileterek yapar; bkz.
 * src/app/api/auth/logout/route.ts.
 * Ayarlar sidebar/breadcrumb gibi birden fazla yerde tekrarlanan çıkış mantığını
 * tek noktadan sağlar.
 */
export function useLogout(): () => Promise<void> {
  const router = useRouter();

  return async function logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(routes.login());
  };
}
