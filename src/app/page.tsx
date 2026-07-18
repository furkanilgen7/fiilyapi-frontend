"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import type { MeResponse } from "@/lib/auth/types";
import "./home.css";

// F2 gecici ana sayfasi — F3 kabugu (Topbar/Sidebar/dashboard) bunu degistirecek.
export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
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
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (isLoading || !me) {
    return <main className="home home--loading">Yükleniyor…</main>;
  }

  return (
    <main className="home">
      <div className="home-card">
        <h1>Hoş geldiniz, {me.full_name}</h1>
        <div className="home-role">
          <Badge variant="primary">{me.title}</Badge>
        </div>
        <p className="home-note">
          Bu geçici bir ana sayfadır. Gösterge paneli ve kabuk (Topbar/Sidebar) sonraki fazda gelir.
        </p>
        <Button variant="secondary" onClick={handleLogout}>Çıkış Yap</Button>
      </div>
    </main>
  );
}
