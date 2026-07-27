"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { isForbidden } from "@/lib/api/unwrap";
import { backendErrorMessage } from "@/lib/settings/error-message";
import { cx } from "@/lib/cx";
import { usePreferences, useUpdatePreferences } from "@/lib/api/hooks/usePreferences";
import type { PreferencesRead, PreferencesUpdate } from "@/lib/api/models";
import "./appearance-screen.css";

// Sadece Acik tema secilebilir; Koyu/Sistem yakinda gelecek (sunucu 4xx doner).
const THEMES: Array<{ key: PreferencesRead["theme"]; label: string; enabled: boolean; preview: "light" | "dark" | "system" }> = [
  { key: "light", label: "Açık", enabled: true, preview: "light" },
  { key: "dark", label: "Koyu", enabled: false, preview: "dark" },
  { key: "system", label: "Sistem", enabled: false, preview: "system" },
];

// Vurgu rengi paleti — veri degeri (hex), token degil.
const ACCENT_COLORS = ["#2563eb", "#16a34a", "#8b5cf6", "#f59e0b", "#ef4444", "#0f766e", "#1e293b"];

const LOCALE_OPTIONS: Array<{ value: PreferencesRead["locale"]; label: string }> = [
  { value: "tr", label: "🇹🇷 Türkçe" },
  { value: "en", label: "🇬🇧 English" },
];

const CURRENCY_OPTIONS: Array<{ value: PreferencesRead["currency"]; label: string }> = [
  { value: "TRY", label: "₺ Türk Lirası" },
  { value: "USD", label: "$ Dolar" },
  { value: "EUR", label: "€ Euro" },
];

const DATE_FORMAT_OPTIONS = [
  { value: "DD.MM.YYYY", label: "GG.AA.YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-AA-GG" },
  { value: "MM/DD/YYYY", label: "AA/GG/YYYY" },
];

const DENSITY_OPTIONS: Array<{ value: PreferencesRead["density"]; name: string; desc: string }> = [
  { value: "comfortable", name: "Rahat", desc: "Geniş boşluklar, büyük alanlar" },
  { value: "normal", name: "Normal", desc: "Dengeli — şu anki görünüm" },
  { value: "compact", name: "Kompakt", desc: "Daha fazla bilgi, daha az boşluk" },
];

export function AppearanceScreen() {
  const query = usePreferences();
  const update = useUpdatePreferences();
  const [form, setForm] = useState<PreferencesRead | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setForm(query.data);
  }, [query.data]);

  if (query.isLoading) return <p className="settings-note">Yükleniyor…</p>;
  if (isForbidden(query.error)) return <AccessDenied />;
  if (query.isError || !query.data || !form) {
    return <p className="settings-note settings-note--error">Görünüm tercihleri yüklenemedi.</p>;
  }

  const set = (patch: Partial<PreferencesRead>) => setForm((f) => (f ? { ...f, ...patch } : f));

  function save() {
    if (!form) return;
    setErr(null);
    const body: PreferencesUpdate = {
      locale: form.locale,
      currency: form.currency,
      date_format: form.date_format,
      density: form.density,
      accent_color: form.accent_color,
      // theme kasitli olarak gonderilmiyor — yalnizca "light" desteklenir, sunucu tarafi bunu zaten varsayilan tutar.
    };
    update.mutate(body, { onError: (e) => setErr(backendErrorMessage(e)) });
  }

  return (
    <>
      <div className="appearance-grid">
        <SettingsCard>
          <div className="appearance-card__title">Tema</div>
          <div className="theme-cards">
            {THEMES.map((t) => {
              const active = t.enabled && form.theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={cx("theme-card", active && "theme-card--active", !t.enabled && "theme-card--disabled")}
                  disabled={!t.enabled}
                  title={!t.enabled ? "Yakında" : undefined}
                  onClick={() => t.enabled && set({ theme: t.key })}
                >
                  <div className={cx("theme-card__preview", `theme-card__preview--${t.preview}`)}>
                    <div className={cx("theme-card__bar", "theme-card__bar--sm", `theme-card__bar--${t.preview}`)} />
                    <div className={cx("theme-card__bar", "theme-card__bar--lg", `theme-card__bar--${t.preview}`)} />
                  </div>
                  <div className={cx("theme-card__label", active ? "theme-card__label--active" : "theme-card__label--muted")}>
                    {t.label}
                    {active ? " ✓" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsCard>
          <div className="appearance-card__title">Vurgu Rengi</div>
          <div className="accent-swatches">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Vurgu rengi ${color}`}
                className={cx("accent-swatch", form.accent_color === color && "accent-swatch--active")}
                style={{ background: color }}
                onClick={() => set({ accent_color: color })}
              />
            ))}
          </div>
        </SettingsCard>

        <SettingsCard>
          <div className="appearance-card__title">Dil &amp; Bölge</div>
          <div className="pref-fields">
            <label className="pref-field">
              <span className="pref-field__label">Arayüz Dili</span>
              <Select value={form.locale} onChange={(e) => set({ locale: e.target.value as PreferencesRead["locale"] })}>
                {LOCALE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="pref-field">
              <span className="pref-field__label">Para Birimi</span>
              <Select
                value={form.currency}
                onChange={(e) => set({ currency: e.target.value as PreferencesRead["currency"] })}
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="pref-field">
              <span className="pref-field__label">Tarih Formatı</span>
              <Select value={form.date_format} onChange={(e) => set({ date_format: e.target.value })}>
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </SettingsCard>

        <SettingsCard>
          <div className="appearance-card__title">Arayüz Yoğunluğu</div>
          <div className="density-rows">
            {DENSITY_OPTIONS.map((opt) => {
              const active = form.density === opt.value;
              return (
                <label key={opt.value} className={cx("density-row", active && "density-row--active")}>
                  <input
                    type="radio"
                    name="density"
                    className="density-row__radio"
                    checked={active}
                    onChange={() => set({ density: opt.value })}
                  />
                  <div>
                    <div className="density-row__name">{opt.name}</div>
                    <div className="density-row__desc">{opt.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </SettingsCard>
      </div>

      {err && <p className="settings-note settings-note--error">{err}</p>}

      <div className="appearance-actions">
        <Button variant="primary" onClick={save} disabled={update.isPending}>
          Kaydet
        </Button>
      </div>
    </>
  );
}
