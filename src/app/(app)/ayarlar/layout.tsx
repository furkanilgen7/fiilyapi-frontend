"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { isActivePath } from "@/lib/shell/isActive";
import "./ayarlar.css";

const TABS = [
  { label: "Kullanıcılar", href: "/ayarlar/kullanicilar" },
  { label: "Roller", href: "/ayarlar/roller" },
  { label: "İzin Matrisi", href: "/ayarlar/izin-matrisi" },
];

export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <section className="ayarlar" aria-labelledby="ayarlar-title">
      <header className="ayarlar__head">
        <h1 id="ayarlar-title" className="ayarlar__title">
          Ayarlar
        </h1>
        <nav className="ayarlar__tabs" aria-label="Ayarlar sekmeleri">
          {TABS.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cx("ayarlar-tab", active && "ayarlar-tab--active")}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="ayarlar__body">{children}</div>
    </section>
  );
}
