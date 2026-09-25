import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";

import { ChipToggleGroup } from "./ChipToggleGroup";
import { SettingsSection } from "./SettingsSection";
import {
  formatDecimalInput,
  parseDecimalInput,
  WEEKDAY_SHORT,
  weekRangeLabel,
} from "./settings-form";

/**
 * Takvim kartı — Ek:109-133.
 *   hafta başı      → `Segmented fill` (Ek:114-116), K5 varsayılan Pazartesi backend'den
 *   günlük saat     → 1–16 (Ek:121-123 · :456), K10 varsayılan 9
 *   çalışılmayan    → çoklu çip (Ek:127-129), S5 varsayılan Pazar
 *
 * ⚠️ Mockup ipucundaki "Hafta 21" PROJE hafta numarasıdır (baseline başlangıcından
 * türer, K7) ve bu uçta YOKTUR → yalnız bu haftanın tarih aralığı basılır.
 */
const WEEKDAY_OPTIONS = WEEKDAY_SHORT.map((label, index) => ({ value: String(index), label }));
const OFF_DAY_OPTIONS = WEEKDAY_SHORT.map((label, index) => ({ value: index, label }));
/** Ek:130 — "sa" gösteriminde saat metni: "9" · "8,5". */
const HOURS_DISPLAY = { int: 2, frac: 2 } as const;

export interface CalendarCardProps {
  weekStartDow: number;
  weeklyOffDays: readonly number[];
  standardDailyHours: string;
  hoursInvalid: boolean;
  offDaysInvalid: boolean;
  disabled: boolean;
  today: Date;
  onWeekStartChange: (dow: number) => void;
  onOffDaysChange: (days: number[]) => void;
  onHoursChange: (text: string) => void;
}

export function CalendarCard({
  weekStartDow,
  weeklyOffDays,
  standardDailyHours,
  hoursInvalid,
  offDaysInvalid,
  disabled,
  today,
  onWeekStartChange,
  onOffDaysChange,
  onHoursChange,
}: CalendarCardProps) {
  const workDays = WEEKDAY_SHORT.length - new Set(weeklyOffDays).size;
  const parsedHours = parseDecimalInput(standardDailyHours, HOURS_DISPLAY.int, HOURS_DISPLAY.frac);
  // Ek:494 `hoursT` — geçersizken "?" basılır.
  const hoursText =
    hoursInvalid || parsedHours === null ? "?" : formatDecimalInput(parsedHours, 0, HOURS_DISPLAY.frac);

  return (
    <SettingsSection title="Takvim" icon="📅" gap="lg">
      <div>
        {/* Ek:113 */}
        <span className="ev-settings__group-caption">Hafta başlangıç günü</span>
        <Segmented
          aria-label="Hafta başlangıç günü"
          fill
          options={WEEKDAY_OPTIONS}
          value={String(weekStartDow)}
          disabled={disabled}
          onChange={(value) => onWeekStartChange(Number(value))}
        />
        {/* Ek:117 */}
        <p className="ev-settings__hint">
          Hafta numarası ve QURR haftası bu günden başlar · şu an {weekRangeLabel(today, weekStartDow)}
        </p>
      </div>
      {/* Ek:119 — 160px | 1fr */}
      <div className="ev-calendar__row">
        <Field
          label="Günlük standart saat"
          hint={hoursInvalid ? undefined : "Adam-Saat Bütçesi ve histogram bu saati kullanır"}
          error={hoursInvalid ? "1–16 arası bir değer girin" : undefined}
        >
          {(control) => (
            <span className="ev-calendar__hours">
              <Input
                {...control}
                size="row"
                numeric
                inputMode="decimal"
                wrapperClassName="ev-settings__num-input ev-settings__num-input--hours"
                status={hoursInvalid ? "error" : "default"}
                value={standardDailyHours}
                disabled={disabled}
                onChange={(event) => onHoursChange(event.target.value)}
              />
              <span className="ev-settings__unit">sa/gün</span>
            </span>
          )}
        </Field>
        <div>
          {/* Ek:126 */}
          <span className="ev-settings__group-caption">Çalışılmayan haftalık günler</span>
          <ChipToggleGroup
            aria-label="Çalışılmayan haftalık günler"
            options={OFF_DAY_OPTIONS}
            value={weeklyOffDays}
            disabled={disabled}
            onChange={(days) => onOffDaysChange([...days].sort((a, b) => a - b))}
          />
          {offDaysInvalid ? (
            // Backend ALL_DAYS_OFF metni (guards.py:16) — mockup bu hâli çizmez.
            <p className="ev-settings__hint ev-settings__hint--error">En az bir çalışma günü olmalı</p>
          ) : (
            // Ek:130
            <p className="ev-settings__hint">
              Haftada <b className="ev-settings__mono">{workDays}</b> iş günü · işçi histogramı kişi =
              a-s ÷ ({workDays} gün × {hoursText} sa)
            </p>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
