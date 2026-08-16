"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import "./payroll-tabs.css";

/**
 * F-BOR · bordro ekranlarının ORTAK sekme şeridi (BG:27-31 · SGK:27-31 ·
 * BY'nin karşılığı). Üç ekran da BU bileşeni basar; ikinci bir şerit
 * YAZILMAZ (`PersonnelTabsStrip` kanonu).
 *
 * 🔴 Aktif sekme `usePathname()`den TÜRER, prop'tan değil: üç sekmenin üçü de
 * AYRI bir rotadır ve hiçbiri sorgu dizesi paylaşmaz, bu yüzden yol tek başına
 * konumu belirler. (`PurchasingTabs`ta aktiflik dışarıdan verilir çünkü orada
 * İKİ sekme AYNI rotayı paylaşır — burada öyle bir çakışma yapısal olarak
 * imkânsızdır.) Eşleşme TAM yoldur: `startsWith` olsaydı `/bordro` ön eki
 * `/bordro/gecmis`te de yanar ve İKİ sekme birden aktif görünürdü (F-SD T7'de
 * yaşanan drill sidebar kusuru).
 *
 * Aktif sekme kendi sayfasına BAĞLANMAZ — gezinme değil, konum bildirir.
 */
interface PayrollTabDef {
  label: string;
  href: string;
}

export const PAYROLL_TABS: readonly PayrollTabDef[] = [
  { label: "Aylık Bordro", href: "/bordro" }, // BG:28
  { label: "Bordro Geçmişi", href: "/bordro/gecmis" }, // BG:29
  { label: "SGK Bildirimi", href: "/bordro/sgk" }, // BG:30
];

export function PayrollTabsStrip() {
  const pathname = usePathname();

  return (
    <div className="bor-strip" role="tablist" aria-label="Bordro sekmeleri">
      {PAYROLL_TABS.map((tab) => {
        const isActive = pathname === tab.href;

        if (isActive) {
          return (
            <span
              key={tab.href}
              role="tab"
              aria-selected
              className="bor-strip__tab bor-strip__tab--active"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={false}
            className="bor-strip__tab"
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
