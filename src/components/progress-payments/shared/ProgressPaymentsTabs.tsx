import Link from "next/link";

import { cx } from "@/lib/cx";

import "./progress-payments-tabs.css";
import { routes } from "@/lib/routes";

/**
 * F-TH T2 · S3 kullanıcı kararı: `/hakedisler` (İşveren) ve
 * `/hakedisler/taseron` (Taşeron) "İşveren | Taşeron" sekmeli kardeş olur.
 * Sekme şeridi HER İKİ sayfada da BU bileşenden basılır (kopya kod yasak) —
 * `ProjectDetailTabs` deseniyle aynı: aktif sekme dışarıdan verilir, bileşen
 * kendi routing hook'unu (`usePathname`) ÇAĞIRMAZ — hem test edilebilirliği
 * artırır hem de her iki sayfanın "use client" olma zorunluluğunu bu
 * bileşene bağlamaz. Gerçek `<Link>` ile gezinir (client-state sekmesi
 * DEĞİL) — URL paylaşılabilir, geri/ileri çalışır.
 *
 * Final inceleme F-4 (a11y): `role="tablist"`/`role="tab"`/`aria-selected`
 * KALDIRILDI. Bu roller ekran okuyucuya "burada ok tuşlarıyla dolaşılan,
 * aynı sayfada panel değiştiren bir sekme grubu var" der; oysa burada gerçek
 * `tabpanel` YOKTUR ve her sekme SAYFA DEĞİŞTİREN bir `<Link>`tir — vaat
 * edilen klavye davranışı çalışmaz. Doğru semantik: gezinme bölgesi
 * (`<nav>`) + aktif linkte `aria-current="page"`. Görsel sunum DEĞİŞMEZ.
 */
export type ProgressPaymentsTab = "employer" | "subcontractor";

interface TabDef {
  key: ProgressPaymentsTab;
  label: string;
  href: string;
}

const TABS: readonly TabDef[] = [
  { key: "employer", label: "İşveren", href: routes.progressPayments.list() },
  { key: "subcontractor", label: "Taşeron", href: routes.progressPayments.subcontractor.list() },
];

export interface ProgressPaymentsTabsProps {
  active: ProgressPaymentsTab;
}

export function ProgressPaymentsTabs({ active }: ProgressPaymentsTabsProps) {
  return (
    <nav className="pp-tabs" aria-label="Hakediş türü">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cx("pp-tabs__tab", tab.key === active && "pp-tabs__tab--active")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
