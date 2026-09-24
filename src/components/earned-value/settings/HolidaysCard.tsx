import { Input } from "@/components/ui/input";
import { XIcon } from "@/components/ui/icons";

import { SettingsSection } from "./SettingsSection";
import { holidayOffDayNote, type HolidayDraft } from "./settings-form";

/**
 * Tatiller kartı — Ek:135-151 (S5: kural oluşturucu YOK, yalnız tek tek tarih).
 *
 * Tarih TEK metin alanıdır (Ek:144 `placeholder="GG.AA.YYYY"`): tek gün
 * "15.07.2026", aralık "26.05.2026 – 30.05.2026" (Ek:416). `ui/DateInput` tek
 * tarih taşır, aralığı basamaz → `ui/Input` + `parseHolidayDates` (sapma raporda).
 */
export interface HolidaysCardProps {
  holidays: readonly HolidayDraft[];
  weeklyOffDays: readonly number[];
  invalidKeys: ReadonlySet<string>;
  disabled: boolean;
  onChange: (key: string, patch: Partial<Pick<HolidayDraft, "dates" | "note">>) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
}

export function HolidaysCard({
  holidays,
  weeklyOffDays,
  invalidKeys,
  disabled,
  onChange,
  onRemove,
  onAdd,
}: HolidaysCardProps) {
  return (
    <SettingsSection title="Tatiller" aside={`${holidays.length} tarih`} gap="md">
      {/* Ek:139 */}
      <p className="ev-settings__hint ev-holidays__lead">
        Haftalık tatil günleri Takvim kartından gelir; burada yalnız tek tek tarihler girilir.
      </p>
      <div className="ev-holidays">
        {/* Ek:141 — 205px | 1fr | 50px */}
        <div className="ev-holidays__head" aria-hidden="true">
          <span>Tarih</span>
          <span>Açıklama</span>
          <span />
        </div>
        {holidays.map((holiday, index) => {
          const order = index + 1;
          const note = holidayOffDayNote(holiday.dates, weeklyOffDays);
          const label = holiday.note.trim() || holiday.dates.trim() || `${order}. satır`;
          return (
            <div key={holiday.key} className="ev-holidays__row">
              {/* Ek:144 */}
              <Input
                size="row"
                aria-label={`Tatil tarihi ${order}`}
                placeholder="GG.AA.YYYY"
                wrapperClassName="ev-holidays__date"
                className="ev-settings__mono"
                status={invalidKeys.has(holiday.key) ? "error" : "default"}
                value={holiday.dates}
                disabled={disabled}
                onChange={(event) => onChange(holiday.key, { dates: event.target.value })}
              />
              {/* Ek:145 */}
              <span className="ev-holidays__note">
                <Input
                  size="row"
                  aria-label={`Tatil açıklaması ${order}`}
                  placeholder="Açıklama"
                  maxLength={200}
                  value={holiday.note}
                  disabled={disabled}
                  onChange={(event) => onChange(holiday.key, { note: event.target.value })}
                />
                {note && <span className="ev-holidays__offday">{note}</span>}
              </span>
              {/* Ek:146 */}
              <button
                type="button"
                className="ev-holidays__remove"
                title="Sil"
                aria-label={`Tatili sil: ${label}`}
                disabled={disabled}
                onClick={() => onRemove(holiday.key)}
              >
                <XIcon />
              </button>
            </div>
          );
        })}
        {/* Ek:149 */}
        <button
          type="button"
          className="ev-holidays__add"
          aria-label="Tatil ekle"
          disabled={disabled}
          onClick={onAdd}
        >
          + Tatil ekle
        </button>
      </div>
    </SettingsSection>
  );
}
