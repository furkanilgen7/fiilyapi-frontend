import { cx } from "@/lib/cx";
import { EMPTY_CELL } from "@/lib/format";
import type { Weather } from "@/lib/api/hooks/useSiteDiary";

import { WEATHER_ICONS } from "./weather-icons";

export interface DiaryWeatherPickerProps {
  value: Weather | "";
  onChange: (value: Weather | "") => void;
  disabled: boolean;
}

/**
 * İ:179-187 · on ikonlu hava seçicisi. Tek seçimli radyo grubudur; seçili
 * kutuya yeniden basmak seçimi KALDIRIR (alan nullable — "seçilmedi" geçerli
 * bir kayıttır, eski `Select`teki "Seçiniz…" seçeneğinin karşılığı).
 */
export function DiaryWeatherPicker({ value, onChange, disabled }: DiaryWeatherPickerProps) {
  const current = WEATHER_ICONS.find((icon) => icon.value === value);
  return (
    <div className="diary-weather">
      <span className="diary-weather__label" id="diary-weather-label">
        Hava durumu · <b>{current?.label ?? EMPTY_CELL}</b>
      </span>
      <div className="diary-weather__grid" role="radiogroup" aria-labelledby="diary-weather-label">
        {WEATHER_ICONS.map((icon) => {
          const isOn = icon.value === value;
          return (
            <button
              key={icon.value}
              type="button"
              role="radio"
              aria-checked={isOn}
              aria-label={icon.label}
              title={icon.label}
              disabled={disabled}
              className={cx("diary-weather__tile", isOn && "diary-weather__tile--on")}
              onClick={() => onChange(isOn ? "" : icon.value)}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                {icon.parts.map((part) => (
                  <path
                    key={part.d}
                    d={part.d}
                    style={{ fill: part.fill, stroke: part.stroke }}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
              <span className="diary-weather__short">{icon.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
