"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/lib/auth/types";

type SessionValue = { me: MeResponse | null; isLoading: boolean };

const SessionContext = createContext<SessionValue>({ me: null, isLoading: true });

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

// Kabuk oturum saglayicisi: /api/auth/me'yi bir kez ceker, Topbar+Sidebar tuketir.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Yalnizca mount'ta calisir. useRouter() App Router'da kararli referans dondurur.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          if (active) router.push("/login");
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
        if (active) router.push("/login");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionContext.Provider value={{ me, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
