import Link from "next/link";

import { ArrowRightIcon, LockIcon } from "@/components/ui/icons";

import {
  LOCK_BANNER_HINT_ACTION,
  LOCK_BANNER_HINT_PREFIX,
  lockBannerHeadline,
  type TimesheetDayLock,
} from "./timesheet-lock";

export interface TimesheetLockBannerProps {
  /** Haftanın kilitli günleri; boşsa band basılmaz (mockup (d)). */
  locks: readonly TimesheetDayLock[];
  /** Şantiye günlük rotası; çözülemediyse bağlantı basılmaz. */
  diaryHref: string | null;
}

/**
 * PLN-F2.4 · Kilit bandı (mockup `Şantiye - Puantaj (Kilitli Gün)` M2;
 * emsal `Şantiye - Günlük Kayıt (İlerleme)` İ:144-148).
 *
 * "Kilidi aç (yetkili)" DÜĞMESİ YOK: kilit puantajdan açılmaz, bağlantı
 * günlük kaydına götürür. Metin `lockBannerText` ile AYNI parçalardan kurulur
 * (ilk cümle kalın, eylem adı kalın).
 */
export function TimesheetLockBanner({
  locks,
  diaryHref,
}: TimesheetLockBannerProps) {
  if (locks.length === 0) return null;
  return (
    <div className="ts-lock-banner" role="status" aria-label="Kilitli günler">
      <LockIcon width={16} height={16} className="ts-lock-banner__icon" />
      <span className="ts-lock-banner__text">
        <b>{lockBannerHeadline(locks)}</b> {LOCK_BANNER_HINT_PREFIX}{" "}
        <b>{LOCK_BANNER_HINT_ACTION}</b>.
      </span>
      {diaryHref !== null && (
        <Link href={diaryHref} className="ts-lock-banner__link">
          Günlük kaydına git
          <ArrowRightIcon width={13} height={13} />
        </Link>
      )}
    </div>
  );
}
