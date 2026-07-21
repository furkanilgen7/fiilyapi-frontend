"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { settingsLabelForPath } from "./settings-nav-config";
import "./settings-shell.css";

export function SettingsBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  const current = settingsLabelForPath(pathname);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="settings-breadcrumb">
      <Link href="/ayarlar/kullanicilar" className="settings-breadcrumb__link">
        Ayarlar
      </Link>
      <span className="settings-breadcrumb__sep" aria-hidden="true">
        /
      </span>
      <span className="settings-breadcrumb__current">{current}</span>
      <button type="button" className="settings-breadcrumb__logout" onClick={handleLogout}>
        Çıkış Yap
      </button>
    </div>
  );
}
