import Link from "next/link";

import { cx } from "@/lib/cx";
import type { ContractType } from "@/lib/api/hooks/useContracts";

import { contractTabHref } from "./contract-tabs";
import "./contracts.css";

/**
 * SZL 26-29 · "İşveren | Taşeron" segment kontrolü. Mockup'ta `<button>`
 * çiftidir; burada `<Link>` çiftidir çünkü sekme durumu URL'dedir (görev
 * emri: paylaşılabilirlik + geri tuşu). `ProgressPaymentsTabs`in a11y kararı
 * BİREBİR uygulanır: `role="tablist"/"tab"` KULLANILMAZ (gerçek `tabpanel`
 * yok, her sekme gezinen bir link), doğru semantik `<nav>` + aktif linkte
 * `aria-current="page"`. Görsel sunum mockup'la aynı kalır.
 */
const TABS: readonly { key: ContractType; label: string }[] = [
  { key: "employer", label: "İşveren" },
  { key: "subcontractor", label: "Taşeron" },
];

export interface ContractTypeTabsProps {
  active: ContractType;
}

export function ContractTypeTabs({ active }: ContractTypeTabsProps) {
  return (
    <nav className="szl-tabs" aria-label="Sözleşme türü">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={contractTabHref(tab.key)}
          aria-current={tab.key === active ? "page" : undefined}
          className={cx("szl-tabs__tab", tab.key === active && "szl-tabs__tab--active")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
