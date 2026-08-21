/**
 * F-UNIT2 · TU 70/71 "Başlangıç Katı" / "Bitiş Katı" listelerinin SAF türevi.
 *
 * 🔴 `unit-form/floor-options.ts`in İKİZİ DEĞİL, SAYISAL KARDEŞİDİR. Tekil
 * ünitede `floor` SERBEST METİNDİR (karar 4: "Zemin" / "Çatı Katı" sayıya
 * çevrilemez) ve o modül METİN seçenekleri üretir. Toplu üretimde ise
 * `start_floor` / `end_floor` TAM SAYIDIR (`Field(ge=-5, le=100)`) çünkü
 * `bulk.py` kat aralığını sayarak dolaşır ve etiketi `floor_label()` ile KENDİ
 * üretir. İki modül aynı bloktan türer ama çıktı TÜRLERİ farklıdır; metin
 * seçeneklerini sayıya çevirmeye çalışmak ("3. Kat" → 3) sessiz ayrıştırma
 * hatası sınıfı açardı.
 *
 * 🔴 ETİKETLER SUNUCUNUN `floor_label()` FONKSİYONUYLA BİREBİRDİR
 * (`backend/app/modules/units/bulk.py`):
 *
 *     if floor == 0: return "Zemin"
 *     if floor > 0:  return f"{floor}. Kat"
 *     return f"{-floor}. Bodrum"
 *
 * Ekran farklı bir etiket basarsa kullanıcı formda "1. Bodrum" seçip
 * kaydettiği ünitelerde BAŞKA bir metin görür. "Zemin" ve "Çatı Katı"
 * dizeleri `unit-form/floor-options.ts`ten YENİDEN KULLANILIR — üçüncü kez
 * yazmak üç kopya demekti.
 *
 * 🔴 ÇATI SENTINEL'İ: TU 71 "Bitiş Katı" seçeneklerinden biri "Çatı Katı"dır
 * ve bu bir SAYI değildir — sunucuda AYRI bir bayrakla taşınır
 * (`roof_floor: bool`, karar 4). Bir `<select>`in değeri her zaman metindir,
 * bu yüzden çatı seçimi `ROOF_FLOOR_SENTINEL` metniyle temsil edilir ve
 * `resolveEndFloor()` onu `{ endFloor, roofFloor }` ikilisine çevirir.
 * Sentinel'in `end_floor`a SIZMASI adlı testle yasaklanmıştır.
 */

import {
  GROUND_FLOOR_LABEL,
  NO_BLOCK_FLOOR_HINT,
  ROOF_FLOOR_LABEL,
  UNKNOWN_FLOOR_COUNT_HINT,
  type BlockFloorSource,
} from "@/components/unit-form/floor-options";
import type { components } from "@/lib/api/schema";

export type { BlockFloorSource };
export { GROUND_FLOOR_LABEL, NO_BLOCK_FLOOR_HINT, ROOF_FLOOR_LABEL, UNKNOWN_FLOOR_COUNT_HINT };

/** `bulk.py::floor_label` sonekleri — metin ORADAN kopyadır. */
const UPPER_FLOOR_SUFFIX = ". Kat";
const BASEMENT_SUFFIX = ". Bodrum";

/**
 * TU 71'de "Çatı Katı"nın `<select>` değeri.
 *
 * Sayısal katların değeri `String(floor)` olduğu için ("-1", "0", "8") bu
 * metin onlarla çakışamaz. Alt çizgili sarmalayıcı ise İKİNCİ bir çakışmayı
 * keser: düz `"roof"` seçilseydi, gövdenin `roof_floor` ANAHTARI onu içerir
 * ve "sentinel gövdeye sızmadı" testi (`JSON.stringify(body)`) kendi
 * bekçiliğini yapamazdı.
 */
export const ROOF_FLOOR_SENTINEL = "__roof__";

/** BE 80 — yalnız bu iki çatı tipi gerçek bir çatı KATI demektir. */
const ROOF_TYPES_WITH_FLOOR: readonly components["schemas"]["BlockRoofType"][] = [
  "duplex",
  "terrace",
];

export interface FloorRangeOption {
  /** `<select>` değeri: sayısal kat için `String(floor)`, çatı için sentinel. */
  value: string;
  /** Kullanıcıya GÖRÜNEN etiket — sunucunun `floor_label()` çıktısıyla aynı. */
  label: string;
}

export interface FloorRange {
  /** TU 70 — YALNIZ sayısal katlar; çatı bir BAŞLANGIÇ olamaz. */
  startOptions: readonly FloorRangeOption[];
  /** TU 71 — sayısal katlar + (blok çatı katı taşıyorsa) "Çatı Katı". */
  endOptions: readonly FloorRangeOption[];
  /** En yüksek SAYISAL kat; blok yokken `null`. Çatı seçimi buna bağlanır. */
  topFloor: number | null;
  /** Liste eksikse kullanıcıya GÖRÜNEN gerekçe; tamsa `null`. */
  hint: string | null;
}

export interface EndFloorResolution {
  /** Gövdeye giren TAM SAYI; seçim yokken `null`. */
  endFloor: number | null;
  /** Gövdedeki `roof_floor` bayrağı. */
  roofFloor: boolean;
}

/** `bulk.py::floor_label` ile BİREBİR. */
export function numericFloorLabel(floor: number): string {
  if (floor === 0) return GROUND_FLOOR_LABEL;
  if (floor > 0) return `${floor}${UPPER_FLOOR_SUFFIX}`;
  return `${-floor}${BASEMENT_SUFFIX}`;
}

/**
 * Kat `<select>` değerini tam sayıya çevirir. Boş metin `null` döner —
 * `Number("")` SIFIR verir ve bu "seçim yok" ile "Zemin"i aynı şey yapardı.
 */
export function parseFloorValue(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^[-+]?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Sayılabilir bir adet mi? `null` ve negatif değer "yok" sayılır. */
function positiveCount(value: number | null): number {
  return value !== null && Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function option(floor: number): FloorRangeOption {
  return { value: String(floor), label: numericFloorLabel(floor) };
}

export function deriveFloorRange(block: BlockFloorSource | null): FloorRange {
  if (block === null) {
    return { startOptions: [], endOptions: [], topFloor: null, hint: NO_BLOCK_FLOOR_HINT };
  }

  const basementCount = positiveCount(block.basement_floor_count);
  const floorCount = positiveCount(block.floor_count);

  const numeric: FloorRangeOption[] = [];
  // En derin bodrumdan yukarı: -2, -1 → "2. Bodrum", "1. Bodrum".
  for (let level = basementCount; level >= 1; level -= 1) numeric.push(option(-level));
  numeric.push(option(0)); // "Zemin" her blokta vardır ve ayrı bir alanı yoktur.
  for (let level = 1; level <= floorCount; level += 1) numeric.push(option(level));

  const hasRoofFloor =
    block.roof_type !== null && ROOF_TYPES_WITH_FLOOR.includes(block.roof_type);

  return {
    startOptions: numeric,
    endOptions: hasRoofFloor
      ? [...numeric, { value: ROOF_FLOOR_SENTINEL, label: ROOF_FLOOR_LABEL }]
      : numeric,
    topFloor: floorCount,
    // `floor_count === null` ("girilmemiş") ile `0` ("gerçekten kat yok")
    // AYRI hâllerdir — `unit-form/floor-options.ts` ile aynı ayrım.
    hint: block.floor_count === null ? UNKNOWN_FLOOR_COUNT_HINT : null,
  };
}

/**
 * TU 71 seçimini gövdenin İKİ alanına çevirir.
 *
 * 🔴 Çatı seçildiğinde `end_floor` en yüksek SAYISAL kattır (`bulk.py` çatı
 * turunu `end_floor`dan SONRA fazladan bir tur olarak üretir) ve sentinel
 * metni gövdeye HİÇ girmez. Blok yokken bir sayı UYDURULMAZ: `endFloor`
 * `null` kalır, `roofFloor` yine `true`dur — kullanıcının seçimi kaybolmaz.
 */
export function resolveEndFloor(selection: string, range: FloorRange): EndFloorResolution {
  if (selection === ROOF_FLOOR_SENTINEL) {
    return { endFloor: range.topFloor, roofFloor: true };
  }
  return { endFloor: parseFloorValue(selection), roofFloor: false };
}
