"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { cx } from "@/lib/cx";

import {
  ACCOUNTING_TABS,
  disabledTabReasons,
  isAccountingNavItemActive,
  type AccountingNavItem,
} from "./accounting-nav-config";
import "./accounting-tabs.css";

/**
 * F-MUP T1 · Muhasebe modül sekmeleri — MP:105-112.
 *
 * 🔴 KAPSAM: şerit `/muhasebe` grubunun HER ekranında basılır, tek tek
 * görünümlerin İÇİNDEN. `layout.tsx`ten basılmadı çünkü MP şeridi sayfa
 * BAŞLIĞININ ALTINA koyuyor (MP:103 başlık → MP:105 şerit); layout'tan
 * basılsaydı şerit her alt ekranın kendi başlığının ÜSTÜNE düşerdi ve
 * mockup'ın sırası bozulurdu.
 *
 * 🔴 Devre dışı sekme SİLİNMEZ (kanon): `<Link>` DEĞİL `<span>` basılır —
 * tıklanabilir bir öğe var olmayan bir yetenek vaat eder — ve gerekçesi
 * şeridin ALTINDA, `title` içinde SAKLANMADAN görünür.
 */
export function AccountingTabs() {
  const pathname = usePathname();
  const reasons = disabledTabReasons();

  return (
    <div className="mu-tabs-block">
      <nav className="mu-tabs" aria-label="Muhasebe sekmeleri" data-testid="mu-tabs">
        {ACCOUNTING_TABS.map((item) => (
          <TabPill key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>
      {reasons.map((reason) => (
        <p className="mu-tabs__reason" key={reason} data-testid="mu-tabs-reason">
          {reason}
        </p>
      ))}
    </div>
  );
}

function TabPill({ item, pathname }: { item: AccountingNavItem; pathname: string }) {
  if (item.kind === "disabled") {
    return (
      <span className="mu-tabs__pill mu-tabs__pill--disabled" aria-disabled="true">
        {item.label}
      </span>
    );
  }
  const active = isAccountingNavItemActive(pathname, item);
  return (
    <Link
      href={item.href}
      className={cx("mu-tabs__pill", active && "mu-tabs__pill--active")}
      aria-current={active ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
}
