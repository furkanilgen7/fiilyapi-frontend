"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/lib/cx";

import {
  FINANCIAL_NAV_HEADING,
  FINANCIAL_NAV_PARENT,
  FINANCIAL_SIBLING_NAV,
  FINANCIAL_SUB_NAV,
  isFinancialNavItemAncestor,
  isFinancialNavItemCurrent,
  type FinancialNavItem,
} from "./financial-statements-nav-config";
import "./financial-statements-shell.css";

/**
 * Mali Tablolar drill-in sidebar'ı — BL:24-31.
 *
 * 🔴 KAPSAM: bu sidebar YALNIZ alt ekranlarda (`/mali-tablolar/bilanco` gibi)
 * basılır, KÖK ekranda (`/mali-tablolar`) BASILMAZ — bu yüzden rota grubunda
 * BİLEREK `layout.tsx` YOKTUR. Gerekçe: kök ekranın kendi mockup'ı (E11) düz
 * kabuğu çizer; drill sidebar orada mockup'a AYKIRI olurdu.
 *
 * 🔴 Her `<nav>` KENDİ `aria-label`ını taşır: repoda üç e2e spec'i adsız
 * `page.getByRole("navigation")` kullanıyor ve etiketsiz bir `<nav>` onları
 * Playwright'ın strict kipinde ÇOK EŞLEŞMEYE düşürürdü.
 */
export function FinancialStatementsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fs-shell-sidebar" aria-label="Mali tablolar menüsü">
      {/* BL:25 */}
      <div className="fs-shell-group__label">{FINANCIAL_NAV_HEADING}</div>

      {/* BL:26 — kardeş modül, alt sekmelerin ÜSTÜNDE ve girintisiz. */}
      <nav className="fs-shell-nav" aria-label="Mali modüller">
        {FINANCIAL_SIBLING_NAV.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* BL:27-30 — üst öğe + girintili alt sekmeler AYNI gezinme grubudur. */}
      <nav className="fs-shell-nav" aria-label="Mali tablolar">
        <NavItem item={FINANCIAL_NAV_PARENT} pathname={pathname} testId="fs-nav-parent" />
      </nav>
      <nav className="fs-shell-nav fs-shell-nav--sub" aria-label="Mali tablo sekmeleri">
        {FINANCIAL_SUB_NAV.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

function NavItem({
  item,
  pathname,
  testId,
}: {
  item: FinancialNavItem;
  pathname: string;
  testId?: string;
}) {
  if (item.kind === "disabled") {
    // 🔴 `<a>`/`Link` DEĞİL: tıklanabilir bir öğe var olmayan bir yetenek vaat
    // eder. Gerekçe `title` içinde SAKLANMAZ, satırın altında BASILIR ve
    // öğenin KENDİ alanından türer (F-PRJTAB kanonu).
    return (
      <span
        className="fs-shell-item fs-shell-item--disabled"
        aria-disabled="true"
        data-testid={testId}
      >
        <span className="fs-shell-item__label">{item.label}</span>
        <span className="fs-shell-item__reason">{item.reason}</span>
      </span>
    );
  }

  const current = isFinancialNavItemCurrent(pathname, item);
  const ancestor = isFinancialNavItemAncestor(pathname, item);
  return (
    <Link
      href={item.href}
      className={cx(
        "fs-shell-item",
        current && "fs-shell-item--current",
        ancestor && "fs-shell-item--ancestor",
      )}
      // 🔴 `aria-current` YALNIZ CURRENT katmanından gelir. Ata vurgusu SALT
      // GÖRSELdir; ikisi de `aria-current` sürseydi sayfada iki "page" olur ve
      // ekran okuyucu iki ayrı sayfada olunduğunu söylerdi.
      aria-current={current ? "page" : undefined}
      data-testid={testId}
    >
      <span className="fs-shell-item__label">{item.label}</span>
    </Link>
  );
}
