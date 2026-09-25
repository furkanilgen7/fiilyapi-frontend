import type { ReactNode } from "react";

import { WEATHER_ICONS } from "@/components/site-diary/weather-icons";
import { CheckIcon, WarningTriangleIcon } from "@/components/ui/icons";
import type { SiteDiaryEntryDetail } from "@/lib/api/hooks/useSiteDiary";
import { cx } from "@/lib/cx";
import { EMPTY_CELL, formatDateDots, formatDecimal, formatWindKmh } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";

import { DIARY_NO_SECTION_LABEL } from "./derive";

/**
 * DET-1.3 · Detay sayfasının METİN kartları — hepsi SALT OKUNUR düz metin
 * (BÜT:485): girdi, onay kutusu, textarea YOK. Boş değer "—" (K20, İ-EK:692).
 * Mockup satırları: 243-253 (Yapılan İşler · Şef notu) · 259-281 (Temel
 * Bilgiler & Hava) · 283-295 (İş Güvenliği) · 489-496 (Fotoğraflar).
 */

function TextCard({ id, title, text }: { id: string; title: string; text: string | null }) {
  const isEmpty = (text?.trim() ?? "") === "";
  return (
    <section className="diary-detail-card" aria-labelledby={id}>
      <h2 className="diary-detail-card__title diary-detail-card__title--spaced" id={id}>
        {title}
      </h2>
      <p className={cx("diary-detail-card__text", isEmpty && "diary-detail-card__text--empty")}>
        {isEmpty ? EMPTY_CELL : text}
      </p>
    </section>
  );
}

/** 243-253 — "📝 Yapılan İşler" (İ:263-266) + "Şantiye Şefi Notu" (E7:141-144). */
export function DiaryDetailNotes({ entry }: { entry: SiteDiaryEntryDetail }) {
  return (
    <>
      <TextCard id="diary-detail-work" title="📝 Yapılan İşler" text={entry.work_done} />
      <TextCard id="diary-detail-chief" title="Şantiye Şefi Notu" text={entry.chief_note} />
    </>
  );
}

function Field({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="diary-detail-card__label">{label}</div>
      <div className={mono ? "diary-detail-card__value diary-detail-card__value--mono" : "diary-detail-card__value"}>
        {children}
      </div>
    </div>
  );
}

function WeatherGlyph({ value }: { value: SiteDiaryEntryDetail["weather"] }) {
  const icon = WEATHER_ICONS.find((item) => item.value === value);
  if (icon === undefined) return null;
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
  );
}

/** 259-281 — "📅 Temel Bilgiler & Hava" (İ:163-207): yalnız SEÇİLİ hava, girdiler düz metin. */
export function DiaryDetailBasicInfo({ entry }: { entry: SiteDiaryEntryDetail }) {
  const weatherLabel = WEATHER_ICONS.find((item) => item.value === entry.weather)?.label ?? EMPTY_CELL;
  const tempMax = entry.temp_max_c ?? entry.temperature_c;
  return (
    <section className="diary-detail-card diary-detail-card--side" aria-labelledby="diary-detail-basic">
      <h2 className="diary-detail-card__title diary-detail-card__title--sm" id="diary-detail-basic">
        📅 Temel Bilgiler &amp; Hava
      </h2>
      <div className="diary-detail-basic__pair">
        <Field label="Tarih" mono>
          {formatDateDots(entry.entry_date)}
        </Field>
        <Field label="Başlık bölümü">{entry.section_name ?? DIARY_NO_SECTION_LABEL}</Field>
      </div>
      <div className="diary-detail-basic__weather">
        <div className="diary-detail-basic__sky">
          <WeatherGlyph value={entry.weather} />
          <div>
            <div className="diary-detail-card__label diary-detail-card__label--tight">Hava durumu</div>
            <div className="diary-detail-card__value diary-detail-card__value--strong">{weatherLabel}</div>
          </div>
        </div>
        <div className="diary-detail-basic__numbers">
          <Field label="Min °C" mono>
            {formatDecimal(entry.temp_min_c, 1)}
          </Field>
          <Field label="Max °C" mono>
            {formatDecimal(tempMax, 1)}
          </Field>
          <Field label="Rüzgâr m/s" mono>
            {formatDecimal(entry.wind_ms, 1)}{" "}
            {/* İ:202 yaklaşığı — "≈" font alt kümesi dışında: "~" (DiaryBasicInfoCard emsali) */}
            <span className="diary-detail-basic__kmh">~ {formatWindKmh(entry.wind_ms)}</span>
          </Field>
        </div>
      </div>
    </section>
  );
}

type Tone = "ok" | "none" | "alert";

function SafetyItem({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <li className="diary-detail-safety__item">
      <span className={cx("diary-detail-safety__chip", `diary-detail-safety__chip--${tone}`)} aria-hidden="true">
        {tone === "ok" && <CheckIcon width={12} height={12} />}
        {tone === "alert" && <WarningTriangleIcon width={11} height={11} />}
        {tone === "none" && "–"}
      </span>
      {children}
    </li>
  );
}

/** 283-295 — "⛑ İş Güvenliği" (GK:441-449): onay kutusu yerine durum çipi + metin. */
export function DiaryDetailSafety({ entry }: { entry: SiteDiaryEntryDetail }) {
  const note = entry.incident_note?.trim() ?? "";
  return (
    <section className="diary-detail-card diary-detail-card--side" aria-labelledby="diary-detail-safety">
      <h2 className="diary-detail-card__title diary-detail-card__title--sm diary-detail-card__title--tight" id="diary-detail-safety">
        ⛑ İş Güvenliği
      </h2>
      <ul className="diary-detail-safety">
        <SafetyItem tone={entry.safety_meeting_held ? "ok" : "none"}>
          {entry.safety_meeting_held ? "Sabah İSG toplantısı yapıldı" : "Sabah İSG toplantısı yapılmadı"}
        </SafetyItem>
        <SafetyItem tone={entry.ppe_checked ? "ok" : "none"}>
          {entry.ppe_checked ? "KKD kontrolü yapıldı" : "KKD kontrolü yapılmadı"}
        </SafetyItem>
        <SafetyItem tone={entry.has_incident ? "alert" : "none"}>
          {entry.has_incident ? "Ramak kala / kaza var" : "Ramak kala / kaza yok"}
        </SafetyItem>
      </ul>
      <p className="diary-detail-safety__note">
        Olay notu:{" "}
        {note === "" ? <span className="diary-detail-safety__empty">{EMPTY_CELL}</span> : note}
      </p>
    </section>
  );
}

/** 489-496 — S11: fotoğraf kartı devre dışı notla; yükleme hücresi/ızgara YOK (sahte fotoğraf basılmaz). */
export function DiaryDetailPhotos() {
  return (
    <section className="diary-detail-card" aria-labelledby="diary-detail-photos">
      <h2 className="diary-detail-card__title diary-detail-card__title--head" id="diary-detail-photos">
        📷 Şantiye Fotoğrafları
      </h2>
      <p className="diary-detail-card__notice">
        Fotoğraf görüntüleme henüz açılmadı — {pendingModuleLabel("documents")}.
      </p>
    </section>
  );
}
