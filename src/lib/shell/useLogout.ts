"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";

export const LOGOUT_ERROR_MESSAGE = "Çıkış yapılamadı, tekrar deneyin.";

export interface UseLogoutResult {
  logout: () => Promise<void>;
  error: string | null;
}

/**
 * Oturumu kapatır: BFF çıkış ucunu çağırır ve /login'e yönlendirir. Sunucu-taraflı
 * iptali (token_version) BFF kendi içinde backend'e ileterek yapar; bkz.
 * src/app/api/auth/logout/route.ts.
 * Sidebar/Ayarlar sidebar/breadcrumb gibi birden fazla yerde tekrarlanan çıkış
 * mantığını tek noktadan sağlar.
 *
 * 🔴 Ne `response.ok` kontrolsüz ne `try/catch`siz bırakılmaz:
 * (a) BFF 403/500 dönse bile koşulsuz /login'e atılırsa sunucu oturumu
 *     GERÇEKTEN kapatmamış olsa bile kullanıcı "çıkış yaptım" sanır.
 * (b) `fetch` ağ hatasıyla REDDEDERSE (offline) yakalanmamış bir promise
 *     reddi kullanıcıya sessizce kalır. Yalnız BAŞARILI yanıtta yönlendirilir;
 *     diğerlerinde çağırana görünür bir hata döner, sessiz yutma YOKTUR.
 */
export function useLogout(): UseLogoutResult {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setError(LOGOUT_ERROR_MESSAGE);
        return;
      }
      router.push(routes.login());
    } catch {
      setError(LOGOUT_ERROR_MESSAGE);
    }
  }, [router]);

  return { logout, error };
}
