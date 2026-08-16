import type { TrialBalanceTotals } from "@/lib/api/hooks/useTrialBalance";
import { CheckCircleIcon, WarningTriangleIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format";

import { trialBalanceImbalance } from "./trial-balance";

interface TrialBalanceBannerProps {
  /** 🔴 SUNUCUNUN kararı — istemci denge testini YENİDEN KOŞMAZ. */
  isBalanced: boolean;
  totals: TrialBalanceTotals;
}

/**
 * MZ:54-57 — kontrol banner'ı.
 *
 * 🔴 DENGE KARARI SUNUCUNUNDUR: `is_balanced` alanı olduğu gibi okunur.
 * İstemcide `closing_debit === closing_credit` karşılaştırmasını tekrarlamak
 * iki ayrı doğruluk kaynağı doğururdu (ve sunucu Decimal, istemci string
 * karşılaştırdığı için ölçekten kaynaklı sahte uyuşmazlık üretirdi).
 *
 * 🔴 K2 · DENGESİZ DAL MOCKUP'TA ÇİZİLMEMİŞTİR (ONAYLI SAPMA). Bağlanan
 * davranış: AYNI banner iskeleti `--danger` tonuna döner, ikon
 * `CheckCircleIcon` → `WarningTriangleIcon` olur ve metin farkı SÖYLER.
 * Çizilmemiş bir dalı hiç basmamak, kullanıcıya dengesiz mizanı DENGELİ
 * göstermek olurdu; ayrı bir yüzey icat etmek ise mockup'ın kendi dilinden
 * sapmak olurdu — iskelet KORUNUR, yalnız ton/ikon/metin döner.
 *
 * Sembol bekçisi (F-SEM): çıplak `✓`/`⚠` YAZILMAZ, ikonlar `ui/icons`in
 * inline SVG'leridir.
 *
 * 🔴 ÖLÇÜM — `≠` (U+2260) KULLANILMAZ, "eşit değil" YAZILIR. Görev emri metni
 * `Toplam Borç ≠ Toplam Alacak` diyordu; `src/styles/fonts.css`teki 25
 * `@font-face` kuralının `unicode-range`leri ayrıştırılıp tarandı ve U+2260
 * bunların HİÇBİRİNDE yok (kapsananlar: `–` U+2013 ve `—` U+2014 →
 * `2000-206F`; `₺` U+20BA → `20AD-20C0`). Kapsanmayan tek bir glif, tarayıcıyı
 * o karakter için SİSTEM yedeğine düşürür — `ubuntu-latest`te bu yedek
 * belirsizdir ve F-SEM'de `makine-yakit` karesini turdan tura oynatan kusurun
 * ta kendisidir. Anlam korunur, glif riski alınmaz.
 */
export function TrialBalanceBanner({ isBalanced, totals }: TrialBalanceBannerProps) {
  if (isBalanced) {
    return (
      <p className="mu-banner mu-banner--ok" data-testid="mz-banner">
        <CheckCircleIcon className="mu-banner__icon" />
        {/* MZ:56 — dengedeyken iki kapanış toplamı EŞİTtir; biri basılır. */}
        <span>{`Mizan Dengede — Toplam Borç = Toplam Alacak: ${formatCurrency(totals.closing_debit)}`}</span>
      </p>
    );
  }
  return (
    <p className="mu-banner mu-banner--off" data-testid="mz-banner">
      <WarningTriangleIcon className="mu-banner__icon" />
      <span>{`Mizan Dengede Değil — Toplam Borç ile Toplam Alacak eşit değil (fark: ${formatCurrency(
        trialBalanceImbalance(totals),
      )})`}</span>
    </p>
  );
}
