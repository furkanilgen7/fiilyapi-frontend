import Link from "next/link";

import { cx } from "@/lib/cx";

import { UNIT_FORM_TABS, unitFormTabsPendingReason, type UnitFormTabLabel } from "./routes";
import "./unit-shell.css";

export interface UnitFormTabsProps {
  /** Bu ekranda AKTİF olan sekme (BE 48 / UE 51 / TU 50 `tab-on`). */
  activeTab: UnitFormTabLabel;
}

/**
 * BE 47-53 · UE 49-55 · TU 47-53 — blok/ünite form ailesinin ortak sekme şeridi.
 *
 * ⚠️ Aktif sekme `Link` DEĞİL `<span>`dır: gezinme değil KONUM bildirir
 * (`PersonnelTabsStrip` deseni).
 *
 * 🔴 Rotası olmayan sekme SİLİNMEZ, `<span aria-disabled>` olarak basılır ve
 * gerekçe şeridin ALTINDA GÖRÜNÜR bir paragrafta durur — `title`da saklanmaz
 * (F-TH kanonu). Gerekçe sekme tanımından TÜRETİLİR (`unitFormTabsPendingReason`):
 * her yeni rota cümleyi kısaltır, sonuncusu bağlandığında paragraf
 * kendiliğinden kaybolur ve ekranda onu yalanlayan bayat bir not KALMAZ
 * (`ProjectDetailTabs`in düzelttiği çürüme sınıfı).
 */
export function UnitFormTabs({ activeTab }: UnitFormTabsProps) {
  const pendingReason = unitFormTabsPendingReason();

  return (
    <>
      <div className="uf-tabs" role="tablist" aria-label="Ünite yönetimi form sekmeleri">
        {UNIT_FORM_TABS.map((tab) => {
          const isActive = tab.label === activeTab;

          if (tab.href === undefined) {
            return (
              <span
                key={tab.label}
                role="tab"
                aria-selected={false}
                aria-disabled
                tabIndex={-1}
                title={pendingReason ?? undefined}
                className="uf-tabs__tab uf-tabs__tab--disabled"
              >
                {tab.label}
              </span>
            );
          }

          if (isActive) {
            return (
              <span
                key={tab.label}
                role="tab"
                aria-selected
                tabIndex={-1}
                className="uf-tabs__tab uf-tabs__tab--active"
              >
                {tab.label}
              </span>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              role="tab"
              aria-selected={false}
              className={cx("uf-tabs__tab")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {pendingReason ? (
        <p className="uf-tabs__note" data-testid="unite-form-sekme-gerekce">
          {pendingReason}
        </p>
      ) : null}
    </>
  );
}
