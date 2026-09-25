/**
 * PLN-F3.1 · API yanıtları (`SettingsRead`, rapor `pf_bands`/`*_band` alanları)
 * ↔ saf `PfBandSettings`/`PfBand` (bkz. `./bands`) köprüsü.
 *
 * İKİ AYRI KAYNAK vardır ve şemada BİLE BİLE farklıdır:
 *  - `SettingsRead.pf_bands` (Ayarlar > Planlama): HER ZAMAN doludur,
 *    `daily.high_above` `string` (nullable DEĞİL).
 *  - Rapor `pf_bands` (`PfBandsOut`, Panel/GİR/QURR): `daily.high_above`
 *    NULLABLE'dır — bu yüzden `DailyPfThresholds.highAbove` de `string | null`.
 *
 * RENK KURALI (F3-SOZLESME.md §2): yanıtta satırın kendi `*_band` alanı
 * VARSA `reportBand(o)` kullanılır (backend zaten hesaplamış); YOKSA
 * `pfBand(değer, bandsFromReport(pf_bands) ?? ayar, kind)` ile İSTEMCİ
 * hesaplar. İstemci hiçbir zaman backend'in bandını YENİDEN türetmez.
 */
import type { EvApiPfBand, EvPfBandsOut, EvSettingsRead } from "@/lib/api/models";

import { DEFAULT_PF_BANDS, type PfBand, type PfBandSettings } from "./bands";

/** Ayarlar > Planlama'nın eşikleri (bugünkü `useDiaryProgressExtension.bandsFrom` — TAŞINDI). */
export function bandsFromSettings(settings: EvSettingsRead | undefined): PfBandSettings {
  if (settings === undefined) return DEFAULT_PF_BANDS;
  const { daily, weekly } = settings.pf_bands;
  return {
    daily: { redBelow: daily.red_below, greenFrom: daily.green_from, highAbove: daily.high_above },
    weekly: { redBelow: weekly.red_below, greenFrom: weekly.green_from },
  };
}

/**
 * Rapor gövdesindeki `pf_bands`i (`cumulative`/`daily`) `PfBandSettings`e
 * çevirir — `cumulative` alanı `weekly` eşiğine gider (K19: kümülatif PF
 * haftalık bantları kullanır). Gövde yoksa (eski/dondurulmuş snapshot ya da
 * backend henüz göndermiyorsa) `null` — çağıran ayar bantlarına düşer.
 */
export function bandsFromReport(bands: EvPfBandsOut | null | undefined): PfBandSettings | null {
  if (bands == null) return null;
  return {
    daily: {
      redBelow: bands.daily.red_below,
      greenFrom: bands.daily.green_from,
      highAbove: bands.daily.high_above,
    },
    weekly: { redBelow: bands.cumulative.red_below, greenFrom: bands.cumulative.green_from },
  };
}

/** Backend'in hesapladığı bandı istemci tipine geçirir; boşsa "none" (bant yok). */
export function reportBand(band: EvApiPfBand | null | undefined): PfBand {
  return band ?? "none";
}
