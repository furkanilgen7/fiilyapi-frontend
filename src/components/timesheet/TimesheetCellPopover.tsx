"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button/Button";
import { ArrowRightIcon, LockIcon, XIcon } from "@/components/ui/icons";
import { AnchoredPopover } from "@/components/ui/popover/AnchoredPopover";
import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import { cx } from "@/lib/cx";
import { formatDecimal } from "@/lib/format";

import { TIMESHEET_CODES, timesheetCodeMeta } from "./timesheet-codes";
import { lockNoteText } from "./timesheet-lock";

export interface TimesheetCellPopoverProps {
  /** Hücrenin şu anki kodu (taslak dâhil); `null` = saat hücresi ya da boş. */
  code: TimesheetCode | null;
  /** "Ahmet Yılmaz · 13 Tem" — diyalogun erişilebilir adı. */
  label: string;
  /** `null` = "Saate dön" (kodu kaldır, hücre yeniden saat kutusu olur). */
  onSubmit: (code: TimesheetCode | null) => void;
  onClose: () => void;
}

/**
 * Hücrenin KOD yüzeyi (PUAN-SAAT · onaylı türetim).
 *
 * ═══ NEDEN AYRI BİR YÜZEY VAR ═══
 * Mockup hücreyi SAAT KUTUSU çizer (E5 238) ve kodu ROZET çizer (E5 260/281),
 * ama rozeti NASIL seçtiğini ÇİZMEZ. Kod seçme yolu olmasaydı `İzin`/`Görev`
 * verisi ekrandan yazılamaz — uçta var olan bir yetenek sessizce KAYBOLURDU.
 * Bu yüzden hücrenin yanında küçük bir kod çapası durur ve bu yüzeyi açar.
 *
 * ═══ SIRIŞMA TESTİ SAVUNMASI ═══
 * Her parçası matrisin KENDİ görsel dilinden alındı:
 *   • Kod seçenekleri matristeki ROZETİN TA KENDİSİDİR — aynı `.ts-tag` +
 *     `.ts-tag--<modifier>` sınıfları (E5 260/281 renkleri), yalnız
 *     tıklanabilir. Seçili olanın çerçevesi `currentcolor`dur.
 *   • Kabuk F-PL popover'ının ölçü/zemin ailesini izler; çıplak hex/px YOK.
 *
 * 🔴 SAAT BURADA DÜZENLENMEZ: saat hücrenin KENDİ kutusundadır (mockup
 * birebir). İki yerde saat alanı olsaydı hangisinin kazandığı belirsizleşirdi.
 *
 * Escape / dış tık İPTALDİR; seçim ancak tıklanan rozetle taslağa yazılır.
 */
export function TimesheetCellPopover({
  code,
  label,
  onSubmit,
  onClose,
}: TimesheetCellPopoverProps) {
  return (
    <AnchoredPopover
      label={`${label} — puantaj hücresi`}
      onClose={onClose}
      className="ts-pop"
      // ⚠️ `.ts-week-scroll { overflow-x: auto }` dikey ekseni de `auto`ya
      // çevirir; yüzey kabın içinde KESİLİR ve tabloya sahte dikey kaydırma
      // ekler (F-PT T5'te ölçülen gerçek kusur). `escapeOverflow` yüzeyi kabın
      // dışına çıkarır; görsel dil aynen kalır.
      escapeOverflow
    >
      <div className="ts-pop__form">
        <p className="ts-pop__hint">Çalışılmayan gün için sebep seçin.</p>
        <div className="ts-pop__codes" role="group" aria-label="Puantaj kodu">
          {TIMESHEET_CODES.map((meta) => (
            <Button
              key={meta.code}
              variant="ghost"
              size="sm"
              aria-pressed={code === meta.code}
              aria-label={meta.label}
              className={cx(
                "ts-tag",
                `ts-tag--${meta.modifier}`,
                "ts-pop__code",
                code === meta.code && "ts-pop__code--active",
              )}
              onClick={() => onSubmit(meta.code)}
            >
              {meta.letter}
            </Button>
          ))}
        </div>
        <div className="ts-pop__actions">
          <Button
            variant="ghost"
            size="sm"
            className="ts-pop__clear"
            onClick={() => onSubmit(null)}
          >
            Saate dön
          </Button>
        </div>
      </div>
    </AnchoredPopover>
  );
}

export interface TimesheetLockedCellPopoverProps {
  /** "Mehmet Yılmaz · 22 Eyl" — diyalogun erişilebilir adının gövdesi. */
  label: string;
  /** "Mehmet Yılmaz · Sal 22 Eyl" — yüzeyin görünen başlığı (mockup M3). */
  title: string;
  hours: string | null;
  code: TimesheetCode | null;
  /** Kilidi koyan raporun tarihi; bugün sözleşmede yok → `null`. */
  reportDate: string | null;
  /** Şantiye günlük rotası; çözülemediyse bağlantı basılmaz. */
  diaryHref: string | null;
  onClose: () => void;
}

/**
 * PLN-F2.4 · KİLİTLİ hücrenin SALT OKUNUR yüzeyi (§3.14 P1, mockup
 * `Şantiye - Puantaj (Kilitli Gün)` M3).
 *
 * Kod rozetleri ve "Saate dön" GÖSTERİLMEZ: yalnız değer (Saat · Kod), kilit
 * notu ve günlük kaydına bağlantı. Kilit puantajdan AÇILMAZ — bağlantı günlük
 * kaydındaki "Kilidi aç (yetkili)"e götürür. Kapatma × / Escape / dış tık
 * (`AnchoredPopover`).
 */
export function TimesheetLockedCellPopover({
  label,
  title,
  hours,
  code,
  reportDate,
  diaryHref,
  onClose,
}: TimesheetLockedCellPopoverProps) {
  const hasHours = hours !== null && hours.trim().length > 0;
  const codeLabel = code === null ? "—" : (timesheetCodeMeta(code)?.label ?? "—");
  return (
    <AnchoredPopover
      label={`${label} — kilitli puantaj hücresi`}
      onClose={onClose}
      className="ts-pop ts-pop--locked"
      escapeOverflow
    >
      {/* Kilitli Gün M3 — başlık + × */}
      <div className="ts-pop__head">
        <span className="ts-pop__title">{title}</span>
        <Button variant="ghost" size="sm" className="ts-pop__close" aria-label="Kapat" onClick={onClose}>
          <XIcon width={14} height={14} />
        </Button>
      </div>
      {/* Kilitli Gün M3 — iki kolonlu değer ızgarası */}
      <dl className="ts-pop__values">
        <dt>Saat</dt>
        <dd className="ts-pop__value ts-pop__value--strong">
          {hasHours ? formatDecimal(hours, 1) : "—"}
        </dd>
        <dt>Kod</dt>
        <dd className="ts-pop__value">{codeLabel}</dd>
      </dl>
      {/* Kilitli Gün M3 — salt okunur mini bant (13px kilit) */}
      <p className="ts-pop__lock-note">
        <LockIcon width={13} height={13} className="ts-pop__lock-icon" />
        {lockNoteText(reportDate)}
      </p>
      {diaryHref !== null && (
        <Link href={diaryHref} className="ts-pop__diary-link">
          Günlük kaydına git
          <ArrowRightIcon width={12} height={12} />
        </Link>
      )}
    </AnchoredPopover>
  );
}
