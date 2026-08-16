import { CheckCircleIcon, WarningTriangleIcon } from "@/components/ui/icons";
import type { BalanceSheetResponse } from "@/lib/api/hooks/useBalanceSheet";
import { formatCurrency } from "@/lib/format";

import { balanceSheetImbalance } from "./balance-sheet";

/**
 * 🔴 K3 · BL mockup'ı YALNIZ DENGELİ dalı çizer — DENGESİZ dal ONAYLI
 * SAPMAdır. Bağlanan davranış `TrialBalanceBanner` iskeletinin AYNISIdır: tek
 * bir `<p>` banner'ı, `--ok` dalında `CheckCircleIcon`, `--off` dalında
 * `WarningTriangleIcon` + `--danger` tonu ve farkı SÖYLEYEN metin.
 *
 * Çizilmemiş bir dalı hiç basmamak, kullanıcıya dengesiz bir bilançoyu DENGELİ
 * göstermek olurdu; ayrı bir yüzey icat etmek ise mockup'ın kendi dilinden
 * sapmak olurdu — iskelet KORUNUR, yalnız ton/ikon/metin döner.
 *
 * 🔴 DENGE KARARI SUNUCUNUNDUR: `is_balanced` alanı OLDUĞU GİBİ okunur.
 * İstemcide `assets.total === liabilities.total` karşılaştırmasını tekrarlamak
 * ikinci bir doğruluk kaynağı doğururdu (ve şema açıklaması bunu adıyla
 * gerekçelendiriyor: dengesiz bir `reversed` fiş DB'ye GİREBİLİR, uç bu yüzden
 * `is_balanced`i ÖLÇER).
 *
 * Sembol bekçisi (F-SEM): çıplak `✓`/`⚠` YAZILMAZ, ikonlar `ui/icons`in inline
 * SVG'leridir. 🔴 `≠` (U+2260) KULLANILMAZ — `src/styles/fonts.css`teki
 * `unicode-range`lerin HİÇBİRİ onu kapsamaz ve kapsanmayan bir glif tarayıcıyı
 * sistem yedeğine düşürür (F-SEM'in `makine-yakit` kusuru). "eşit değil"
 * YAZILIR; anlam korunur, glif riski alınmaz.
 */
export function BalanceSheetBanner({ data }: { data: BalanceSheetResponse }) {
  if (data.is_balanced) {
    return (
      <p className="fs-banner fs-banner--ok" data-testid="bl-banner">
        <CheckCircleIcon className="fs-banner__icon" />
        {/* Dengedeyken iki taraf toplamı EŞİTtir; biri basılır (BL:60 · BL:85
            aynı rakamı yazar). */}
        <span>{`Bilanço Dengede — ${data.assets.total_label} = ${data.liabilities.total_label}: ${formatCurrency(
          data.assets.total,
        )}`}</span>
      </p>
    );
  }
  return (
    <p className="fs-banner fs-banner--off" data-testid="bl-banner">
      <WarningTriangleIcon className="fs-banner__icon" />
      <span>{`Bilanço Dengede Değil — ${data.assets.total_label} ile ${data.liabilities.total_label} eşit değil (fark: ${formatCurrency(
        balanceSheetImbalance(data),
      )})`}</span>
    </p>
  );
}
