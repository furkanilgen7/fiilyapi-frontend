import type { Weather } from "@/lib/api/hooks/useSiteDiary";

/**
 * Hava enum'unun Türkçe etiketleri — TEK KAYNAK (F-P6'nin `section-labels.ts`
 * deseni). Backend enum'u BEŞ değerlidir (`sunny`/`partly_cloudy`/`cloudy`/
 * `rainy`/`snowy`); etiketler `Ekran 7 - Şantiye Günlüğü Girişi.dc.html`
 * satır 83-88'den birebir alınır (GK188-189 aynı listeyi DÖRT seçenekle
 * basıyor — `cloudy` orada eksik; beş değerli enum E7'de tamdır).
 */
export const WEATHER_LABELS: Record<Weather, string> = {
  sunny: "☀ Güneşli",
  partly_cloudy: "⛅ Parçalı Bulutlu",
  cloudy: "☁ Bulutlu",
  rainy: "🌧 Yağışlı",
  snowy: "❄ Karlı",
};

/** `Select` seçenekleri — sıra E7 83-88 ile birebir. */
export const WEATHER_OPTIONS: readonly { value: Weather; label: string }[] = (
  ["sunny", "partly_cloudy", "cloudy", "rainy", "snowy"] as const
).map((value) => ({ value, label: WEATHER_LABELS[value] }));

/** Kayıt durumu rozeti (GK362: "Gönderildi"). */
export const DIARY_STATUS_LABELS: Record<"draft" | "submitted", string> = {
  draft: "Taslak",
  submitted: "Gönderildi",
};

/** Serbest metin alanlarının üst sınırları (`maxLength` zorunlu — WORKFLOW §4). */
export const DIARY_WORK_DONE_MAX = 4000;
export const DIARY_CHIEF_NOTE_MAX = 2000;
export const DIARY_INCIDENT_NOTE_MAX = 2000;
/** "Bugün Yapılan" hücresi: numeric(14,3) — işaret/ondalık dahil geniş tavan. */
export const DIARY_QUANTITY_MAX = 20;
