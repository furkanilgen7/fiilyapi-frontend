import Link from "next/link";

import { cx } from "@/lib/cx";

import "./progress-payments-tabs.css";

/**
 * F-TH T2 · S3 kullanıcı kararı: `/hakedisler` (İşveren) ve
 * `/hakedisler/taseron` (Taşeron) "İşveren | Taşeron" sekmeli kardeş olur.
 * Sekme şeridi HER İKİ sayfada da BU bileşenden basılır (kopya kod yasak) —
 * `ProjectDetailTabs` deseniyle aynı: aktif sekme dışarıdan verilir, bileşen
 * kendi routing hook'unu (`usePathname`) ÇAĞIRMAZ — hem test edilebilirliği
 * artırır hem de her iki sayfanın "use client" olma zorunluluğunu bu
 * bileşene bağlamaz. Gerçek `<Link>` ile gezinir (client-state sekmesi
 * DEĞİL) — URL paylaşılabilir, geri/ileri çalışır.
 */
export type ProgressPaymentsTab = "employer" | "subcontractor";

interface TabDef {
  key: ProgressPaymentsTab;
  label: string;
  href: string;
}

const TABS: readonly TabDef[] = [
  { key: "employer", label: "İşveren", href: "/hakedisler" },
  { key: "subcontractor", label: "Taşeron", href: "/hakedisler/taseron" },
];

export interface ProgressPaymentsTabsProps {
  active: ProgressPaymentsTab;
}

export function ProgressPaymentsTabs({ active }: ProgressPaymentsTabsProps) {
  return (
    <div className="pp-tabs" role="tablist" aria-label="Hakediş sekmeleri">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          role="tab"
          aria-selected={tab.key === active}
          className={cx("pp-tabs__tab", tab.key === active && "pp-tabs__tab--active")}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
