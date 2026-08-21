import {
  CheckIcon,
  ScalesIcon,
  WarningTriangleIcon,
  XIcon,
  inlineSymbolProps,
} from "@/components/ui/icons";
import type {
  LandShareContract,
  LandShareCountBalance,
  LandShareValueBalance,
} from "@/lib/api/hooks/useLandShare";
import { formatCompactCurrencyTight } from "@/lib/format";

import {
  ALLOCATION_ACTUAL_RATIO_LABEL,
  ALLOCATION_ASSIGNED_NOW_LABEL,
  ALLOCATION_BALANCE_CARD_TITLE,
  ALLOCATION_COUNT_BALANCE_TITLE,
  ALLOCATION_MISSING_LABEL,
  ALLOCATION_OUR_VALUE_LABEL,
  ALLOCATION_OWNER_VALUE_LABEL,
  ALLOCATION_VALUE_BALANCE_TITLE,
  allocationActualRatioLabel,
  allocationContractRequirementLabel,
  allocationUnitCountLabel,
} from "./constants";
import { valueBalanceVerdict, type ValueBalanceVerdictKind } from "./value-balance";

interface AllocationBalanceCardProps {
  contract: LandShareContract;
  countBalance: LandShareCountBalance;
  valueBalance: LandShareValueBalance;
}

/**
 * Hüküm ikonu — ÜÇ hâl, ÜÇ simge. `✓` (U+2713) ve `✗` (U+2717) glif
 * bekçisinin YASAK sınıfındadır; hesaplanamaz hâl ise ne onay ne redittir,
 * bu yüzden uyarı üçgeni taşır.
 */
const VERDICT_ICON: Readonly<Record<ValueBalanceVerdictKind, typeof CheckIcon>> = {
  ok: CheckIcon,
  off: XIcon,
  uncomputable: WarningTriangleIcon,
};

/**
 * "Paylaşım Denge Kontrolü" kartı (PG 243-267).
 *
 * 🔴 İKİ DENGE YAN YANA DURUR ve TEK bir "dengede mi" bayrağına indirgenmez
 * (`LandShareBalance` açıklaması: *"Iki denge YAN YANA doner … tek 'dengede mi'
 * bayragina indirgenmez (K2)"*). Adet dengesi (PG 247-253) hep hesaplanabilir;
 * DEĞER dengesi (PG 255-261) hesaplanamayabilir ve ikisi AYNI hükme bağlanamaz.
 *
 * 🔴🔴 HÜKÜM ÜÇ HÂLLİDİR — hesaplanamaz hâl `value-balance.ts`te kendi dalını
 * alır. `is_within_tolerance === null` iken yeşil "denge uygun" basmak da
 * `%0` yazmak da GERÇEK bir hatadır ve DERLEYİCİ ONU GÖRMEZ: tip sistemi
 * alanın var olduğunu zorlar, ne anlama geldiğini değil.
 *
 * 🔴 EŞİK SUNUCUDAN GELİR (`tolerance_pct`) ve hesaplanamaz hâlde bile döner;
 * istemcide bir eşik sabiti YOKTUR — bir eşik iki yerde yaşarsa ayrışır.
 *
 * ⚠️ PG 245'in `⚖️`si U+2696 + VS16'dır; glif bekçisinin izin listesinde
 * YOKTUR ve VS16 kurtarması YALNIZ `⚠` (U+26A0) içindir → `ScalesIcon`.
 */
export function AllocationBalanceCard({
  contract,
  countBalance,
  valueBalance,
}: AllocationBalanceCardProps) {
  const verdict = valueBalanceVerdict(contract, valueBalance);
  const VerdictIcon = VERDICT_ICON[verdict.kind];

  return (
    <section className="pf-card" data-testid="paylasim-form-denge-kart">
      <h2 className="pf-card__title">
        <ScalesIcon {...inlineSymbolProps} />
        {ALLOCATION_BALANCE_CARD_TITLE}
      </h2>

      <div className="pg-balance">
        {/* 247-253 — adet dengesi */}
        <div>
          <div className="pg-balance__title">{ALLOCATION_COUNT_BALANCE_TITLE}</div>
          <div className="pg-balance__list">
            <div className="pg-balance-row pg-balance-row--ours">
              <span className="pg-balance-row__label">
                {allocationContractRequirementLabel(contract.our_share_pct)}
              </span>
              <span className="pg-balance-row__value" data-testid="paylasim-form-beklenen-adet">
                {allocationUnitCountLabel(countBalance.our_expected_count)}
              </span>
            </div>
            <div className="pg-balance-row pg-balance-row--neutral">
              <span className="pg-balance-row__label">{ALLOCATION_ASSIGNED_NOW_LABEL}</span>
              <span className="pg-balance-row__value" data-testid="paylasim-form-atanan-adet">
                {allocationUnitCountLabel(countBalance.our_assigned_count)}
              </span>
            </div>
            {/* 252 — `our_missing_count` İŞARETLİDİR: eksi = FAZLA atama.
                `Math.abs` "3 eksik" ile "3 fazla"yı aynı sayı yapardı. */}
            <div className="pg-balance-row pg-balance-row--missing">
              <span className="pg-balance-row__label">{ALLOCATION_MISSING_LABEL}</span>
              <span className="pg-balance-row__value" data-testid="paylasim-form-eksik-adet">
                {allocationUnitCountLabel(countBalance.our_missing_count)}
              </span>
            </div>
          </div>
        </div>

        {/* 255-261 — değer dengesi */}
        <div>
          <div className="pg-balance__title">{ALLOCATION_VALUE_BALANCE_TITLE}</div>
          <div className="pg-balance__list">
            <div className="pg-balance-row pg-balance-row--ours pg-balance-row--money">
              <span className="pg-balance-row__label">{ALLOCATION_OUR_VALUE_LABEL}</span>
              <span className="pg-balance-row__value" data-testid="paylasim-form-bizim-deger">
                {formatCompactCurrencyTight(valueBalance.our_value)}
              </span>
            </div>
            <div className="pg-balance-row pg-balance-row--neutral pg-balance-row--money">
              <span className="pg-balance-row__label">{ALLOCATION_OWNER_VALUE_LABEL}</span>
              <span className="pg-balance-row__value" data-testid="paylasim-form-arsa-deger">
                {formatCompactCurrencyTight(valueBalance.owner_value)}
              </span>
            </div>
            {/* 260 — 🔴 İKİ ORAN DA `null` OLABİLİR; `%0` BASILMAZ */}
            <div className="pg-balance-row pg-balance-row--actual">
              <span className="pg-balance-row__label">{ALLOCATION_ACTUAL_RATIO_LABEL}</span>
              <span className="pg-balance-row__value" data-testid="paylasim-form-gerceklesen-oran">
                {allocationActualRatioLabel(
                  valueBalance.our_actual_pct,
                  valueBalance.owner_actual_pct,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 264-266 — hüküm şeridi */}
      <p
        className={`pg-verdict pg-verdict--${verdict.kind}`}
        data-testid="paylasim-form-denge-hukmu"
        data-verdict={verdict.kind}
      >
        <strong className="pg-verdict__title">
          <VerdictIcon {...inlineSymbolProps} />
          {verdict.title}
        </strong>{" "}
        — {verdict.detail}
      </p>
    </section>
  );
}
