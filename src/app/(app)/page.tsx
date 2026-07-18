"use client";

import { useSession } from "@/components/shell/SessionProvider";
import "./home.css";

// Kabuk ici gecici ana sayfa. Gercek gosterge paneli F6'da gelir.
export default function HomePage() {
  const { me, isLoading } = useSession();

  return (
    <div className="home">
      <h1 className="home__title">
        Hoş geldiniz{me ? `, ${me.full_name}` : ""}
      </h1>
      <p className="home__note">
        {isLoading
          ? "Yükleniyor…"
          : "Gösterge paneli ve modüller sonraki fazlarda eklenecek. Sol menüden gezinebilirsiniz."}
      </p>
    </div>
  );
}
