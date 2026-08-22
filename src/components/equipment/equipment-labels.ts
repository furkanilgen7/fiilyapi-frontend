import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { EquipmentOwnership, EquipmentStatus } from "@/lib/api/hooks/useEquipment";

/**
 * F-MK T2 · M1 (`Makine & Ekipman.dc.html`) etiket/renk sözlüğü.
 *
 * ⚠️ K2 — DURUM SUNUCUDAN GELİR. Burada eşik/yüzde hesaplayan tek satır
 * yoktur; `EquipmentStatus` dizesinin GÖRÜNÜME çevrilmesidir (F-P10/F-ST
 * kanonu).
 */
export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  working: "Çalışıyor", // 91, 104, 130, 156
  broken: "Arızalı", // 117
  maintenance: "Bakımda", // 143
  idle: "Boşta", // mockup'ta kart örneği yok — K21: sunucu ekstra durum açabilir
};

/**
 * Rozet renkleri — mockup zemin/metin çiftleri `Badge` varyantlarına oturur:
 * Çalışıyor `#dcfce7/#16a34a` = success · Arızalı `#fee2e2/#dc2626` = danger ·
 * Bakımda `#fef3c7/#d97706` = warning. `idle` mockup'ta çizilmediği için en
 * yakın nötr varyanta düşer (VARSAYIM — rapora not edilir).
 */
export const EQUIPMENT_STATUS_BADGE_VARIANTS: Record<EquipmentStatus, BadgeVariant> = {
  working: "success",
  broken: "danger",
  maintenance: "warning",
  idle: "neutral",
};

/** Kart üst kenarlığı — mockup arızalı/bakımda kartlara renkli kenarlık verir (114, 140). */
export type EquipmentCardTone = "danger" | "warning" | "neutral";

export function equipmentCardTone(status: EquipmentStatus): EquipmentCardTone {
  if (status === "broken") return "danger";
  if (status === "maintenance") return "warning";
  return "neutral";
}

/** Değer basılamıyorken (K3: `null` türev alan) ortak yer tutucu — asla "0" değil. */
export const EQUIPMENT_EMPTY_VALUE = "—";

/** K3 — `rate_amount`/`rate_period` yoksa günlük kira hücresine konan ipucu. */
export const EQUIPMENT_RATE_UNKNOWN_HINT = "Günlük kira bedeli tanımlı değil";

/** K3 — `operator_id` yoksa operatör hücresine konan ipucu. */
export const EQUIPMENT_OPERATOR_UNKNOWN_HINT = "Operatör/şoför atanmadı";

/** K6 — `site_id` `null` ⇒ ekipman depoda, hiçbir şantiyeye atanmamış. */
export const EQUIPMENT_UNASSIGNED_SITE_LABEL = "Depoda (Atanmadı)";

/* ---------------------------------------------------------------------------
 * K1 — Alt-navigasyon (§1 birleşimi, BEŞ sekme). Devre-dışı sekmelerin
 * gerekçesi mockup'ın kendisinden DEĞİL, spec K1'den birebir alınır.
 * ------------------------------------------------------------------------ */

// F-KIRA: `EQUIPMENT_TAB_LEASE_SETTLEMENT_REASON` KALDIRILDI — "Kira Hakedişi"
// sekmesi artık `/makine/kira` rotasına iner, devre-dışı değildir. Gerekçe
// sabiti bırakılsaydı hiçbir yerden okunmayan ölü bir metin olurdu.
export const EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON =
  "Bakım takvimi mockup'ı henüz yok";

/* ---------------------------------------------------------------------------
 * K10 — Kayıt ekleme formları PENDING (M3 "+ Kayıt Ekle" / M4 "+ Yakıt
 * Girişi"). Bu ekranda (M1) doğrudan kullanılmaz ama tek kaynak burada
 * tutulur — T3/T4 kopya cümle YAZMAZ.
 * ------------------------------------------------------------------------ */
export const EQUIPMENT_CREATE_FORM_PENDING_REASON =
  "Kayıt formu mockup'ı henüz çizilmedi";

/* ---------------------------------------------------------------------------
 * F-BLG T2b — "Belge Ekle" diyaloğunun bağlam bandı (`Form - Ekipman
 * Belgesi.dc.html` 79) sahiplik etiketini metin olarak taşır. Sözlük M2
 * formunun `OWNERSHIP_OPTIONS` başlıklarıyla (`equipment-form/constants.ts`
 * 57 · 65) AYNIdır; iki yerde de mockup metni kaynaktır.
 * ------------------------------------------------------------------------ */
export const EQUIPMENT_OWNERSHIP_LABELS: Record<EquipmentOwnership, string> = {
  owned: "Kendi Malımız",
  rented: "Kiralık",
};
