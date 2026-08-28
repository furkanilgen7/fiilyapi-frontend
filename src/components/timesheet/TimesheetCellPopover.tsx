"use client";

import { Button } from "@/components/ui/button/Button";
import { AnchoredPopover } from "@/components/ui/popover/AnchoredPopover";
import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import { cx } from "@/lib/cx";

import { TIMESHEET_CODES } from "./timesheet-codes";

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
            <button
              key={meta.code}
              type="button"
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
            </button>
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
