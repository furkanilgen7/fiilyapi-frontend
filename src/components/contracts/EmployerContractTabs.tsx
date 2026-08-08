import Link from "next/link";

import { cx } from "@/lib/cx";

import {
  EMPLOYER_CONTRACT_TABS,
  employerContractTabHref,
  type EmployerContractTab,
} from "./employer-contract-tabs";
import "./employer-contract-detail.css";

/**
 * E14 90-95 · dört sekmelik segment kontrolü. SZL'nin `ContractTypeTabs`
 * deseniyle aynı: sekmeler GERÇEK link'tir (paylaşılabilir URL + geri tuşu),
 * `aria-current="page"` seçili olanı işaretler.
 */
export interface EmployerContractTabsProps {
  projectId: string;
  active: EmployerContractTab;
}

export function EmployerContractTabs({ projectId, active }: EmployerContractTabsProps) {
  return (
    <nav className="ecd-tabs" aria-label="Sözleşme detay sekmeleri">
      {EMPLOYER_CONTRACT_TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <Link
            key={tab.value}
            href={employerContractTabHref(projectId, tab.value)}
            aria-current={isActive ? "page" : undefined}
            className={cx("ecd-tabs__tab", isActive && "ecd-tabs__tab--active")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
