/**
 * F-UNIT2 T2c · PG 264-266 "Değer Dengesi" hüküm şeridinin SAF katmanı.
 *
 * 🔴 BU DOSYANIN VAR OLMA SEBEBİ TEK BİR HATA SINIFIDIR ve derleyici o sınıfı
 * GÖRMEZ. `LandShareValueBalance`ın dört alanı (`our_actual_pct`,
 * `owner_actual_pct`, `deviation_pct`, `is_within_tolerance`) `null`
 * OLABİLİR ve şemanın kendi cümlesiyle bu "HESAPLANAMAZ"dır, "sıfır" DEĞİL:
 *
 *   *"Dort alan `None` olabilir ve bu 'HESAPLANAMAZ'dir, 'sifir' degil:
 *   atanmis rayic deger toplami 0 ise (rayic girilmemis proje) sapma
 *   tanimsizdir ve `0` donmek ekrana '✓ denge uygun' bastirirdi."*
 *
 * Tip sistemi `is_within_tolerance`ın VAR olduğunu zorlar; `null`u "yanlış"
 * saymanın (`if (balance.is_within_tolerance)` → kırmızı şerit) ya da
 * doğruluk kontrolüyle `%0` basmanın YANLIŞ olduğunu SÖYLEMEZ. Bu yüzden hüküm
 * ÜÇ HÂLLİ bir birleşimdir ve `null` KENDİ dalını alır — ikili bir bayrağa
 * indirgenemez.
 *
 * 🔴 EŞİK SUNUCUDAN GELİR. `tolerance_pct` hesaplanamaz hâlde BİLE döner
 * (*"frontend esigi kopyalamak zorunda kalmasin diye"*); istemci kendi sabitini
 * yazsaydı bir eşik iki yerde yaşar ve zamanla ayrışırdı. Bu dosyada eşik
 * SAYISI yoktur — yalnız sunucunun gönderdiği değer biçimlendirilir.
 */

import type { LandShareContract, LandShareValueBalance } from "@/lib/api/hooks/useLandShare";
import { formatPercent } from "@/lib/format";

import {
  ALLOCATION_VERDICT_OFF_TITLE,
  ALLOCATION_VERDICT_OK_TITLE,
  ALLOCATION_VERDICT_UNCOMPUTABLE_DETAIL,
  ALLOCATION_VERDICT_UNCOMPUTABLE_TITLE,
} from "./constants";

/**
 * `uncomputable` bir HATA hâli DEĞİLDİR ve `off` ile aynı şey de değildir:
 * "sapma tanımsız" ile "sapma eşiği aştı" farklı cümlelerdir ve farklı renk
 * taşırlar (nötr ↔ kırmızı).
 */
export type ValueBalanceVerdictKind = "ok" | "off" | "uncomputable";

export interface ValueBalanceVerdict {
  kind: ValueBalanceVerdictKind;
  /** Şeridin kalın başlığı (PG 265). */
  title: string;
  /** Başlığı izleyen açıklama cümlesi (PG 266). */
  detail: string;
}

/** Sözleşme oranı cümlesi için gereken tek şey iki orandır. */
type ContractRatios = Pick<LandShareContract, "our_share_pct" | "owner_share_pct">;

export function valueBalanceVerdict(
  contract: ContractRatios,
  balance: LandShareValueBalance,
): ValueBalanceVerdict {
  const { our_actual_pct: ourActual, owner_actual_pct: ownerActual } = balance;
  const { deviation_pct: deviation, is_within_tolerance: withinTolerance } = balance;

  // 🔴 DÖRT ALANIN HERHANGİ BİRİ `null` ise hüküm YOKTUR. Yalnız
  // `is_within_tolerance`a bakmak yetmezdi: sunucu dördünü birlikte `None`
  // yapıyor, ama tek bir alanın eksikliği bile cümleyi uydurma hâline
  // getirirdi ("gerçekleşen %—") ve `null`u `0` gibi basardı.
  if (
    withinTolerance === null ||
    ourActual === null ||
    ownerActual === null ||
    deviation === null
  ) {
    return {
      kind: "uncomputable",
      title: ALLOCATION_VERDICT_UNCOMPUTABLE_TITLE,
      detail: ALLOCATION_VERDICT_UNCOMPUTABLE_DETAIL,
    };
  }

  // PG 266 cümlesi. Eşik SUNUCUDAN (`tolerance_pct`) gelir — istemci sabiti YOK.
  const head =
    `Sözleşme oranı ${formatPercent(contract.our_share_pct)}/${formatPercent(contract.owner_share_pct)}, ` +
    `gerçekleşen ${formatPercent(ourActual)}/${formatPercent(ownerActual)}. ` +
    `Sapma ${formatPercent(deviation)}`;
  const limit = formatPercent(balance.tolerance_pct);

  return withinTolerance
    ? {
        kind: "ok",
        title: ALLOCATION_VERDICT_OK_TITLE,
        detail: `${head} (kabul sınırı ${limit} içinde).`,
      }
    : {
        kind: "off",
        title: ALLOCATION_VERDICT_OFF_TITLE,
        detail: `${head} — kabul sınırı ${limit} aşıldı.`,
      };
}
