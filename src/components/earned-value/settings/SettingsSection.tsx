import { useId } from "react";

import { cx } from "@/lib/cx";

/**
 * Ayarlar - Planlama kartı — Ek:110 (Takvim) · :136 (Tatiller) · :154 (Durum
 * toleransı) · :171 (PF bantları) · :211 (Paçal metrikler): 14px köşe, 1px
 * kenar, 20px iç boşluk, kart gölgesi, dikey akış. Kartlar arası dikey aralık
 * mockup'ta karttan karta değişir (16 · 14 · 12) → `gap` varyantı.
 *
 * `settings/primitives/SettingsCard` KULLANILMADI: o kart başlığı ayırıcı
 * çizgili bir şeritte basar; bu mockup'ta başlık gövdenin ilk satırıdır.
 */
export type SettingsSectionGap = "lg" | "md" | "sm";

export interface SettingsSectionProps {
  title: string;
  /** Başlık önü simge (mockup emojisi) — yalnız alt küme İÇİNDEKİLER (symbol-subset-guard). */
  icon?: string;
  /** Başlık yanı gri not — "5 tarih" (Ek:137), "QURR başlık kartlarında görünür" (Ek:212). */
  aside?: React.ReactNode;
  gap?: SettingsSectionGap;
  children: React.ReactNode;
}

export function SettingsSection({ title, icon, aside, gap = "md", children }: SettingsSectionProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cx("ev-settings-card", `ev-settings-card--${gap}`)}>
      <div className="ev-settings-card__head">
        <h2 id={titleId} className="ev-settings-card__title">
          {icon && (
            <span aria-hidden="true" className="ev-settings-card__icon">
              {icon}
            </span>
          )}
          {title}
        </h2>
        {aside != null && <span className="ev-settings-card__aside">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
