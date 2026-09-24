import { cx } from "@/lib/cx";
import "./segmented.css";

export interface SegmentedOption<V extends string> {
  value: V;
  /** Metin ya da ikon + metin (Adam-Saat Bütçesi.dc.html:316 dağılım eğrisi ikonu). */
  label: React.ReactNode;
  disabled?: boolean;
}

export type SegmentedSize = "md" | "sm";

export interface SegmentedProps<V extends string> {
  options: ReadonlyArray<SegmentedOption<V>>;
  value: V;
  onChange: (value: V) => void;
  /** Grubun erişilebilir adı — ZORUNLU: düğmeler tek başına bağlamı anlatmaz. */
  "aria-label": string;
  /** Tüm grubu kapatır (salt okunur hâl: Bütçe:674 `dis: readOnly`, Ayarlar:76 `disabled={ro}`). */
  disabled?: boolean;
  /** md = filtre çubuğu (Panel:115-119, QURR:97-101) · sm = satır içi (Bütçe:313-319). */
  size?: SegmentedSize;
  /** Düğmeler kabı eşit paylaşarak doldurur (Ayarlar - Planlama:75-77 hafta başı). */
  fill?: boolean;
  className?: string;
}

/**
 * Tek seçimli, kontrollü segment kontrolü.
 *
 * Erişilebilirlik emsali `site-planning/PlanViewModeSwitch.tsx`: `role="group"`
 * + `aria-pressed` taşıyan native düğmeler. Native `<button>` olduğu için
 * Tab / Enter / Space ek kod istemez. Seçili seçeneğe yeniden tıklamak
 * `onChange` çağırmaz — tek seçim hiçbir zaman boşa düşmez.
 */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  disabled = false,
  size = "md",
  fill = false,
  className,
}: SegmentedProps<V>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        "segmented",
        `segmented--${size}`,
        fill && "segmented--fill",
        disabled && "segmented--disabled",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled || option.disabled}
            className={cx("segmented__item", isSelected && "segmented__item--selected")}
            onClick={() => {
              if (!isSelected) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
