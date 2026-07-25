"use client";

import { useEffect, useState } from "react";
import { Button, Toggle } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { useCompany, useUpdateCompany } from "@/lib/api/hooks/useCompany";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { isForbidden } from "@/lib/api/unwrap";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { CompanyUpdate } from "@/lib/api/models";
import "./company-screen.css";

// e-Arşiv portalı seçenekleri (ref mockup — backend serbest metin alanı kabul eder).
const EARSIV_PORTAL_OPTIONS = ["Logo e-Fatura", "Mikro e-Fatura", "Paraşüt", "Türk Telekom"];

// KDV oranı seçenekleri (ref mockup).
const VAT_RATE_OPTIONS = ["20", "10", "1", "0"];

function vatRateToSelectValue(rate: CompanyUpdate["default_vat_rate"]): string {
  if (rate == null) return "20";
  const parsed = Math.trunc(Number(rate));
  return Number.isFinite(parsed) ? String(parsed) : "20";
}

export function CompanyScreen() {
  const query = useCompany();
  const update = useUpdateCompany();
  const [form, setForm] = useState<CompanyUpdate>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setForm({
      name: query.data.name,
      tax_number: query.data.tax_number,
      tax_office: query.data.tax_office,
      trade_registry_no: query.data.trade_registry_no,
      kep_address: query.data.kep_address,
      phone: query.data.phone,
      email: query.data.email,
      website: query.data.website,
      address: query.data.address,
      brand_color: query.data.brand_color,
      gib_integration_code: query.data.gib_integration_code,
      earsiv_portal: query.data.earsiv_portal,
      default_vat_rate: query.data.default_vat_rate,
      auto_einvoice: query.data.auto_einvoice,
    });
  }, [query.data]);

  if (query.isLoading) return <p className="settings-note">Yükleniyor…</p>;
  if (isForbidden(query.error)) return <AccessDenied />;
  if (query.isError || !query.data) {
    return <p className="settings-note settings-note--error">Şirket bilgileri yüklenemedi.</p>;
  }

  const set = (patch: Partial<CompanyUpdate>) => setForm((f) => ({ ...f, ...patch }));

  const field = (label: string, key: keyof CompanyUpdate, mono = false) => (
    <label className="company-field">
      <span className="company-field__label">{label}</span>
      <input
        className={mono ? "is-mono" : undefined}
        value={(form[key] as string) ?? ""}
        onChange={(e) => set({ [key]: e.target.value } as Partial<CompanyUpdate>)}
      />
    </label>
  );

  function save() {
    setErr(null);
    update.mutate(form, { onError: (e) => setErr(backendErrorMessage(e)) });
  }

  return (
    <>
      <div className="company-grid">
        <SettingsCard>
          <div className="company-card__title">Firma Bilgileri</div>
          <div className="company-form">
            {field("Firma Adı", "name")}
            {field("Vergi No", "tax_number")}
            {field("Vergi Dairesi", "tax_office")}
            {field("Ticaret Sicil No", "trade_registry_no")}
            {field("KEP Adresi", "kep_address")}
          </div>
        </SettingsCard>

        <SettingsCard>
          <div className="company-card__title">İletişim &amp; Adres</div>
          <div className="company-form">
            {field("Telefon", "phone")}
            {field("E-posta", "email")}
            {field("Web Sitesi", "website")}
            <label className="company-field">
              <span className="company-field__label">Adres</span>
              <textarea value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
            </label>
          </div>
        </SettingsCard>

        <SettingsCard>
          <div className="company-card__title">Logo &amp; Marka</div>
          <div className="company-logo">
            <span className="company-logo__preview" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="5" y="5" width="13" height="13" rx="2" fill="var(--color-on-brand)" />
                <rect x="22" y="5" width="13" height="13" rx="2" fill="var(--color-on-brand)" opacity=".7" />
                <rect x="5" y="22" width="13" height="13" rx="2" fill="var(--color-on-brand)" opacity=".7" />
                <rect x="22" y="22" width="13" height="13" rx="2" fill="var(--color-on-brand)" opacity=".3" />
              </svg>
            </span>
            <div>
              <div className="company-logo__name">FİİL Yapı Logo</div>
              <div className="company-logo__caption">PNG, SVG · Önerilen 200×200px</div>
              {/* Logo yükleme (POST /company/logo) kapsam dışı — buton pasif, takip görevi. */}
              <Button variant="secondary" size="sm">
                ↑ Logo Yükle
              </Button>
            </div>
          </div>
          <label className="company-field company-color-field">
            <span className="company-field__label">Birincil Renk</span>
            <span className="company-color-row">
              <span className="company-swatch" style={{ background: form.brand_color ?? "#2563eb" }} />
              <input
                className="is-mono"
                value={form.brand_color ?? ""}
                onChange={(e) => set({ brand_color: e.target.value })}
              />
            </span>
          </label>
        </SettingsCard>

        <SettingsCard>
          <div className="company-card__title">Fatura &amp; e-Fatura Ayarları</div>
          <div className="company-form">
            {field("GİB Entegrasyon Kodu", "gib_integration_code", true)}
            <label className="company-field">
              <span className="company-field__label">e-Arşiv Portalı</span>
              <select value={form.earsiv_portal ?? ""} onChange={(e) => set({ earsiv_portal: e.target.value })}>
                {EARSIV_PORTAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="company-field">
              <span className="company-field__label">KDV Oranı (Varsayılan)</span>
              <select
                value={vatRateToSelectValue(form.default_vat_rate)}
                onChange={(e) => set({ default_vat_rate: e.target.value })}
              >
                {VAT_RATE_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    %{rate}
                  </option>
                ))}
              </select>
            </label>
            <div className="company-toggle-row">
              <span className="company-toggle-row__text">
                <span className="company-toggle-row__label">Otomatik e-Fatura</span>
                <span className="company-toggle-row__subtitle">Hakediş onayında otomatik gönder</span>
              </span>
              <Toggle
                checked={form.auto_einvoice ?? false}
                onChange={(e) => set({ auto_einvoice: e.target.checked })}
                aria-label="Otomatik e-Fatura"
              />
            </div>
          </div>
        </SettingsCard>
      </div>

      {err && <p className="settings-note settings-note--error">{err}</p>}

      <div className="company-actions">
        <Button variant="secondary" onClick={() => query.refetch()}>
          İptal
        </Button>
        <Button variant="primary" onClick={save} disabled={update.isPending}>
          Değişiklikleri Kaydet
        </Button>
      </div>
    </>
  );
}
