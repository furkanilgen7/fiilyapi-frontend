import Link from "next/link";

import { cx } from "@/lib/cx";

import { PURCHASING_ROOT_HREF, STATUS_PARAM } from "./purchasing-labels";
import "./purchasing.css";

/**
 * SAT 89-94 · dört sekmeli şerit: Satın Alma Talepleri · Teklifler ·
 * Siparişler · Tedarikçiler.
 *
 * Mockup dördünü de `<button>` çizer ama dördü de AYRI YÜZEYDİR (spec K1):
 * gerçek `<Link>` kullanılır — URL paylaşılabilir, geri/ileri çalışır
 * (`ProgressPaymentsTabs` kanonu). Aynı gerekçeyle `role="tablist"`/`tab`
 * KULLANILMAZ: gerçek bir `tabpanel` yoktur ve her sekme SAYFA değiştirir;
 * doğru semantik `<nav>` + aktif linkte `aria-current="page"`dir.
 *
 * ⚠️ "Teklifler" sekmesi TALEP-BAĞIMSIZ BİR LİSTE DEĞİLDİR (spec K3): mockup
 * yalnız talep-bağlı karşılaştırma ekranı çizmiştir, ortada teklif listesi
 * YOKTUR. Bu sekme SAT tablosunun `quote_wait` süzgülü hâlidir — bu yüzden
 * "Satın Alma Talepleri" ile AYNI rotaya, farklı bir sorgu dizesiyle gider.
 *
 * ⚠️ AKTİFLİK DIŞARIDAN VERİLİR (`ProgressPaymentsTabs` deseni): bileşen
 * kendi `usePathname`/`useSearchParams`ını çağırmaz. İki sekme aynı rotayı
 * paylaştığı için ön ek eşleşmesi ÇİFT AKTİFLİK üretirdi — F-SD T7'de drill
 * sidebar'ın kök sekmesi `exact` olmadığı için tam bunu yaşadı. Burada
 * `active` tek bir anahtar olduğundan çift aktiflik YAPISAL OLARAK imkânsız;
 * test bunu ayrıca doğrular.
 */
export type PurchasingTab = "requests" | "quotes" | "orders" | "suppliers";

interface TabDef {
  key: PurchasingTab;
  label: string;
  href: string;
}

const TABS: readonly TabDef[] = [
  { key: "requests", label: "Satın Alma Talepleri", href: PURCHASING_ROOT_HREF }, // 90
  // 91 — süzgeç değeri sunucunun `PurchaseRequestStatus` enum'undan gelir.
  {
    key: "quotes",
    label: "Teklifler",
    href: `${PURCHASING_ROOT_HREF}?${STATUS_PARAM}=quote_wait`,
  },
  { key: "orders", label: "Siparişler", href: "/satinalma/siparisler" }, // 92
  { key: "suppliers", label: "Tedarikçiler", href: "/satinalma/tedarikciler" }, // 93
];

export interface PurchasingTabsProps {
  active: PurchasingTab;
}

export function PurchasingTabs({ active }: PurchasingTabsProps) {
  return (
    <nav className="sat-tabs" aria-label="Satınalma bölümleri">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cx("sat-tabs__tab", tab.key === active && "sat-tabs__tab--active")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
