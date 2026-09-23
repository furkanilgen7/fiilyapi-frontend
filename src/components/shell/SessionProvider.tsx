"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/lib/auth/types";
import { routes } from "@/lib/routes";

type SessionValue = { me: MeResponse | null; isLoading: boolean; error?: boolean };

const SessionContext = createContext<SessionValue>({ me: null, isLoading: true, error: false });

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

// `/api/auth/me` YALNIZ 401/403'te KOTU cerez tasir; digerleri (429/500/502/503)
// GECICI sunucu hatasidir ve oturumun GECERSIZLIGINI KANITLAMAZ (kayit no 463).
function isAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

// Kabuk oturum saglayicisi: /api/auth/me'yi bir kez ceker, Topbar+Sidebar tuketir.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Yalnizca mount'ta calisir. useRouter() App Router'da kararli referans dondurur.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          // 🔴 KAYIT NO 463 — `!res.ok` TEK BASINA yeterli DEGILDIR: 429/502/503
          // GECICI'dir, kullanicinin oturumu GECERSIZ DEGILDIR. Yalniz backend'in
          // GERCEKTEN "kimliksiz/yetkisiz" dedigi 401/403'te /login'e atilir;
          // digerlerinde cerez ZATEN silinmedi (route.ts), yani /login'e atmak
          // middleware'in onu tekrar iceri almasina ve "cikis yapmisim gibi"
          // yanilsamasina yol acardi. Gecici hatada yukleniyor ekraninda
          // sonsuza dek KALINMAZ — hata bayragi kaldirilir, kullanici
          // ekranin BOS/hata durumunu gorur.
          if (active) {
            if (isAuthFailureStatus(res.status)) {
              // M5_1 kayıt #411: 401/403'te de `isLoading` KAPATILMALI —
              // eskiden yalnız `else` dalı (5xx/429) bunu yapıyordu; bu dal
              // yalnız `router.push`e güveniyordu. Bugün hiçbir tüketici
              // `isLoading`i okumasa da (`useModulePermission` bilinmezlik
              // kuralına düşer) state kalıcı `true` kalmamalı — sonsuza dek
              // "yükleniyor" iddiası taşımak yanlış bir durumdur.
              setIsLoading(false);
              router.push(routes.login());
            } else {
              setIsLoading(false);
              setError(true);
            }
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (active && data) {
          setMe(data as MeResponse);
          setIsLoading(false);
        }
      })
      .catch(() => {
        // Ag hatasi (ornegin offline): sunucunun ne dedigi BILINMIYOR, bu yuzden
        // oturumu GECERSIZ SAYIP /login'e atmak yanlis varsayimdir (kayit no 463).
        if (active) {
          setIsLoading(false);
          setError(true);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionContext.Provider value={{ me, isLoading, error }}>
      {children}
    </SessionContext.Provider>
  );
}
