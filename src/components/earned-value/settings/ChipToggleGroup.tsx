import { cx } from "@/lib/cx";

/**
 * Çip seçim grubu — `aria-pressed` taşıyan native düğmeler (`ui/Segmented`
 * erişilebilirlik emsali). `ui/` altında karşılığı YOK; Ayarlar - Planlama üç
 * ayrı çip çizer ve üçü de burada varyant olur:
 *
 *   neutral — çalışılmayan günler, çoklu (Ek:128 · Ek:452 renkleri)
 *   filled  — paçal PAY iş tipleri, çoklu, hap (Ayarlar - Planlama.dc.html:195 · :291)
 *   soft    — paçal PAYDA iş tipi, TEKLİ (Ayarlar - Planlama.dc.html:200 · :293)
 *
 * Tekli modda seçili çipe yeniden tıklamak `onChange` çağırmaz — seçim boşa
 * düşmez (Segmented kanonu).
 */
export type ChipToggleVariant = "neutral" | "filled" | "soft";

export interface ChipToggleOption<V extends string | number> {
  value: V;
  label: React.ReactNode;
}

export interface ChipToggleGroupProps<V extends string | number> {
  options: ReadonlyArray<ChipToggleOption<V>>;
  value: readonly V[];
  onChange: (next: V[]) => void;
  /** Grubun erişilebilir adı — ZORUNLU: çipler tek başına bağlamı anlatmaz. */
  "aria-label": string;
  /** Varsayılan çoklu; `false` → tek seçim. */
  multiple?: boolean;
  disabled?: boolean;
  variant?: ChipToggleVariant;
  className?: string;
}

export function ChipToggleGroup<V extends string | number>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  multiple = true,
  disabled = false,
  variant = "neutral",
  className,
}: ChipToggleGroupProps<V>) {
  function toggle(optionValue: V, isSelected: boolean) {
    if (!multiple) {
      if (!isSelected) onChange([optionValue]);
      return;
    }
    onChange(
      isSelected ? value.filter((selected) => selected !== optionValue) : [...value, optionValue],
    );
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx("ev-chip-group", `ev-chip-group--${variant}`, className)}
    >
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            className={cx("ev-chip", isSelected && "ev-chip--selected")}
            onClick={() => toggle(option.value, isSelected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
