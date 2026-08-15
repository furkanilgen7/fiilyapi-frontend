"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/lib/cx";

import {
  ACCOUNTING_NAV_HEADING,
  ACCOUNTING_NAV_PARENT,
  ACCOUNTING_SIBLING_NAV,
  ACCOUNTING_SUB_NAV,
  isAccountingNavItemActive,
  type AccountingNavItem,
} from "./accounting-nav-config";
import "./accounting-shell.css";

/**
 * Muhasebe drill-in sidebar'ı — HP:28-38.
 *
 * 🔴 KAPSAM (şef kararı, ONAYLI SAPMA ADAYI): sidebar `/muhasebe` grubunun
 * TAMAMINA uygulanır, köke de. Gerekçe: E8'in kendi sidebar çizimi (E8:36-59)
 * düz kabuktur ve Hesap Planı'na HİÇBİR yol göstermez — bu bir mockup
 * boşluğudur; Ayarlar emsalinde drill sidebar grup boyunca tekdüzedir.
 * İkinci ekran açıldığı anda köke sidebar konmasaydı kullanıcı Hesap
 * Planı'na yalnız URL yazarak ulaşabilirdi.
 */
export function MuhasebeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="mu-shell-sidebar" aria-label="Muhasebe menüsü">
      {/* HP:29 */}
      <div className="mu-shell-group__label">{ACCOUNTING_NAV_HEADING}</div>

      {/*
        HP:30 — `Muhasebe` üst öğesi bir BAĞLANTI DEĞİLDİR: hedefi `/muhasebe`
        olsaydı hemen altındaki "Yevmiye Defteri" ile aynı yere giderdi ve kök
        sayfada İKİ öğe birden aktif görünürdü (F-SD T7 kusurunun ta kendisi).
        Mockup'ta da bir hedef değil, içinde bulunulan modülün başlığıdır.
      */}
      <div className="mu-shell-parent" data-testid="mu-nav-parent">
        {ACCOUNTING_NAV_PARENT}
      </div>

      <nav className="mu-shell-nav mu-shell-nav--sub" aria-label="Muhasebe alt sekmeleri">
        {ACCOUNTING_SUB_NAV.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>

      <nav className="mu-shell-nav" aria-label="Mali modüller">
        {ACCOUNTING_SIBLING_NAV.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

function NavItem({ item, pathname }: { item: AccountingNavItem; pathname: string }) {
  if (item.kind === "disabled") {
    // 🔴 `<a>`/`Link` DEĞİL: tıklanabilir bir öğe var olmayan bir yetenek vaat
    // eder. Gerekçe `title` içinde SAKLANMAZ, satırın altında BASILIR.
    return (
      <span className="mu-shell-item mu-shell-item--disabled" aria-disabled="true">
        <span className="mu-shell-item__label">{item.label}</span>
        <span className="mu-shell-item__reason">{item.reason}</span>
      </span>
    );
  }
  const active = isAccountingNavItemActive(pathname, item);
  return (
    <Link
      href={item.href}
      className={cx("mu-shell-item", active && "mu-shell-item--active")}
      aria-current={active ? "page" : undefined}
    >
      <span className="mu-shell-item__label">{item.label}</span>
    </Link>
  );
}
