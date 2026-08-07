"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import { AnchoredPopover } from "@/components/ui/popover/AnchoredPopover";
import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import { cx } from "@/lib/cx";

import type { TimesheetViewCell } from "./derive";
import { TIMESHEET_CODES, type TimesheetVariant } from "./timesheet-codes";
import {
  overtimeHoursText,
  parseOvertimeHours,
  OVERTIME_MAX_HOURS,
} from "./timesheet-draft";
import type { TimesheetCellEdit } from "./useTimesheetEditor";

/**
 * "24" + ondalık ayırıcı + bir basamak = 4 karakter (`3,5` / `12,5` / `24`).
 * Backend sınırı `0 < saat <= 24` ve TEK ondalıktır; alan da o sınırı aşmaz.
 */
const MAX_HOURS_TEXT = 4;

export interface TimesheetCellPopoverProps {
  /** Hücrenin şu anki hâli (taslak dâhil); `null` = boş gün. */
  cell: TimesheetViewCell | null;
  /** "Ahmet Yılmaz · 3 Ağu" — diyalogun erişilebilir adı. */
  label: string;
  variant: TimesheetVariant;
  onSubmit: (edit: TimesheetCellEdit | null) => void;
  onClose: () => void;
}

/**
 * Hücre düzenleme yüzeyi (F-PT T3 · spec §3, kullanıcı ONAYLI türetim).
 *
 * ═══ SIRIŞMA TESTİ SAVUNMASI ═══
 * Mockup hücreleri SALT-OKUNUR çizer, yani bu yüzeyin çizimi YOKTUR. Bu yüzden
 * her parçası matrisin KENDİ görsel dilinden alındı, yeni bir dil icat
 * EDİLMEDİ:
 *   • Beş kod seçeneği matristeki ROZETİN TA KENDİSİDİR — aynı `.ts-cell` +
 *     `.ts-cell--<modifier>` sınıfları (E5 117 · ŞP 151 renkleri), yalnız
 *     tıklanabilir. Seçili olanın çerçevesi `currentcolor`dur: palete YENİ
 *     renk eklenmez.
 *   • Kabuk F-PL popover'ının (`.plan-pop`) ölçü/zemin ailesini izler: kart
 *     kenarlığı + `--shadow-md` + `--radius-10`. Çıplak hex/px YOKTUR.
 *   • Saat alanı `ui/input` primitive'idir (ham `<input>` yasak), düğmeler
 *     `ui/button`.
 *
 * Escape / dış tık İPTALDİR: seçim bu bileşenin YEREL durumunda durur, yalnız
 * "Uygula" (ya da "Temizle") taslağa yazar.
 */
export function TimesheetCellPopover({
  cell,
  label,
  variant,
  onSubmit,
  onClose,
}: TimesheetCellPopoverProps) {
  const [code, setCode] = useState<TimesheetCode | null>(cell?.code ?? null);
  const [hoursText, setHoursText] = useState(overtimeHoursText(cell?.overtimeHours ?? null));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (code === null) {
      setError("Bir kod seçin ya da “Temizle” ile hücreyi boşaltın.");
      return;
    }
    if (code !== "overtime") {
      onSubmit({ code, overtimeHours: null });
      return;
    }
    const parsed = parseOvertimeHours(hoursText);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    onSubmit({ code, overtimeHours: parsed.value });
  }

  return (
    <AnchoredPopover
      label={`${label} — puantaj hücresi`}
      onClose={onClose}
      className={cx("ts-pop", `ts-pop--${variant}`)}
    >
      <form
        className="ts-pop__form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="ts-pop__codes" role="group" aria-label="Puantaj kodu">
          {TIMESHEET_CODES.map((meta) => (
            <button
              key={meta.code}
              type="button"
              aria-pressed={code === meta.code}
              aria-label={meta.labelWithLetter}
              className={cx(
                "ts-cell",
                `ts-cell--${meta.modifier}`,
                "ts-pop__code",
                code === meta.code && "ts-pop__code--active",
              )}
              onClick={() => {
                setCode(meta.code);
                setError(null);
              }}
            >
              {meta.letter}
            </button>
          ))}
        </div>

        {/* Saat alanı YALNIZ FM seçiliyken açılır (ŞP 119 saat toplamının
            kaynağı) ve OPSİYONELDİR: boş bırakılırsa hücre saatsiz FM olur. */}
        {code === "overtime" && (
          <Input
            size="row"
            numeric
            inputMode="decimal"
            value={hoursText}
            maxLength={MAX_HOURS_TEXT}
            aria-label="Fazla mesai saati"
            placeholder={`Saat (isteğe bağlı, en çok ${OVERTIME_MAX_HOURS})`}
            onChange={(event) => {
              setHoursText(event.target.value);
              setError(null);
            }}
          />
        )}

        {error !== null && <p className="ts-pop__error">{error}</p>}

        <div className="ts-pop__actions">
          <Button variant="ghost" size="sm" className="ts-pop__clear" onClick={() => onSubmit(null)}>
            Temizle
          </Button>
          <Button type="submit" size="sm">
            Uygula
          </Button>
        </div>
      </form>
    </AnchoredPopover>
  );
}
