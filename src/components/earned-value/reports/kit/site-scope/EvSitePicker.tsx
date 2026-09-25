"use client";

import { Select } from "@/components/ui/select/Select";
import type { EvSiteOption, EvSiteOptionsState } from "@/lib/api/hooks/useEvSettings";

import "./ev-site-picker.css";

/**
 * PLN-F3.6a · Kök ikizlerin (Panel/GİR/QURR) BAŞLIK bloğundaki şantiye
 * seçicisi (S21). `GeneralManHourBudgetView`in yerel `SitePicker`inden
 * ÇIKARILDI (KOPYALANMADI — Bütçe kendi dosyasında kalır, bu ORTAK kittir).
 *
 * E5 78 etiketi (proje + şantiye); tamamlanmış şantiye işaretlenir.
 */
function optionLabel(option: EvSiteOption): string {
  const base = `${option.projectName} ${option.siteName}`;
  return option.isCompleted ? `${base} · tamamlandı` : base;
}

export interface EvSitePickerProps {
  state: EvSiteOptionsState;
  value: string;
  onChange: (siteId: string) => void;
  /** Ham `<select>` erişilebilir adı — çağıran bağlama göre değiştirebilir. */
  ariaLabel?: string;
}

/** Boş gövdenin nedeni HER ZAMAN yazılır — sessiz boş ekran yok. */
export function EvSitePicker({ state, value, onChange, ariaLabel = "Şantiye" }: EvSitePickerProps) {
  const empty = state.options.length === 0;
  return (
    <div className="ev-site-picker">
      <Select aria-label={ariaLabel} value={value} disabled={empty} onChange={(event) => onChange(event.target.value)}>
        {empty && <option value="">{state.isLoading ? "Yükleniyor…" : "Şantiye yok"}</option>}
        {state.options.map((option) => (
          <option key={option.siteId} value={option.siteId}>
            {optionLabel(option)}
          </option>
        ))}
      </Select>
      {empty && !state.isLoading && (
        <p className="ev-site-picker__empty">
          {state.isError ? "Şantiye listesi yüklenemedi." : "Planlaması olan şantiye bulunmuyor."}
        </p>
      )}
    </div>
  );
}
