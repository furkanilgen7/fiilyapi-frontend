import type { PurchaseOrderStatus } from "@/lib/api/hooks/usePurchaseOrders";

/**
 * SIP · "Teslimat" sütununun RENGİ (F-SA T4).
 *
 * Bu tek türev İSTEMCİDEDİR (spec §1): sunucu yalnız `expected_delivery`
 * tarihini verir, "gecikti / yaklaşıyor / uzak" sınıfı ekranın işidir.
 * Uydurma bir `overdue` sorgu parametresi 422 üretirdi
 * (`usePurchaseOrders` notu).
 *
 * ⚠️ `today` ZORUNLU PARAMETREDİR — gizli `new Date()` YOKTUR
 * (`remainingDays.ts` / `document-format.ts` kanonu). Gerekçe iki katlıdır:
 *   1. birim testler sabit bir "bugün" ile deterministiktir,
 *   2. GÖRSEL KARELER de öyle: ekran `new Date()`i doğrudan çağırsaydı aynı
 *      baseline turdan tura başka renk basar ve kare oynardı (WORKFLOW §4'ün
 *      determinizm kuralının kardeşi). Görsel spec `page.clock.setFixedTime`
 *      ile saati dondurur, ekran onu TEK yerden okur.
 *
 * Renk kuralı mockup'tan SATIR SATIR çıkarılır (`Satınalma - Siparişler.dc.html`):
 *   · 88/110 — `delivered` satırların tarihi NÖTRDÜR (`#64748b`, kalın değil):
 *     15.07 ve 10.07 GEÇMİŞTE olduğu hâlde kırmızı değildir → teslim edilmiş
 *     siparişin tarihi artık bir taahhüt değil, bir kayıttır.
 *   · 65 — teslim edilmemiş ve tarihi GEÇMİŞ/BUGÜN olan satır KIRMIZIDIR
 *     (`#ef4444`, 19.07.2026).
 *   · 76/98/120 — teslim edilmemiş ve tarihi YAKIN olan satırlar KEHRİBARDIR
 *     (`#f59e0b`; 24.07 · 22.07 · 20.07 — 19.07'ye göre 1-5 gün).
 *   · "uzak" dalın mockup'ta örneği YOKTUR; kehribarın bir eşiği olduğu
 *     mockup'ın kendisinden bellidir (aksi hâlde her gelecek tarih kehribar
 *     olurdu ve renk hiçbir şey ayırt etmezdi). Eşik BİR HAFTADIR: mockup'ın
 *     kehribar satırlarının en uzağı 5 gündür, hafta sınırı onları kapsayan
 *     en dar doğal aralıktır.
 */
export type DeliveryTone = "overdue" | "soon" | "neutral";

/** Kehribar dalın üst sınırı (gün) — sihirli sayı değil, adlandırılmış eşik. */
export const DELIVERY_SOON_DAYS = 7;

function utcDay(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day);
}

/**
 * `YYYY-MM-DD` → UTC gün damgası. `new Date(iso)` KULLANILMAZ: TR saatinde
 * bir gün geriye kayardı (`formatDateDots` ile aynı gerekçe).
 */
function parseIsoDay(iso: string): number | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return utcDay(year, month, day);
}

/** `Date` → aynı ölçekte gün damgası (yerel takvim günü esas alınır). */
function todayDay(today: Date): number {
  return utcDay(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Teslimat tarihine kalan gün sayısı; tarih yoksa/çözülemezse `null`.
 * Negatif değer GEÇMİŞ demektir.
 */
export function deliveryDaysLeft(expectedDelivery: string | null, today: Date): number | null {
  if (expectedDelivery === null) return null;
  const target = parseIsoDay(expectedDelivery);
  if (target === null) return null;
  return Math.round((target - todayDay(today)) / DAY_MS);
}

export function deliveryTone(
  expectedDelivery: string | null,
  status: PurchaseOrderStatus,
  today: Date,
): DeliveryTone {
  // 88/110 — teslim edilmiş sipariş hiçbir zaman "gecikmiş" gösterilmez.
  if (status === "delivered") return "neutral";
  const daysLeft = deliveryDaysLeft(expectedDelivery, today);
  if (daysLeft === null) return "neutral";
  if (daysLeft <= 0) return "overdue"; // 65
  if (daysLeft <= DELIVERY_SOON_DAYS) return "soon"; // 76, 98, 120
  return "neutral";
}
