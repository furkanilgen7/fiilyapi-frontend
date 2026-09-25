/**
 * PLN-F3.2b · Grafik kitinin ORTAK saf ölçekleme yardımcıları.
 *
 * F3-SOZLESME.md §0: backend zaten kümülatif/oranlı/bantlı alanları hesaplar
 * (`s_curve`, `bars`, `pf_trend`, `histogram`) — bu dosya YALNIZ o dizileri
 * SVG koordinatına ÖLÇEKLER, hiçbir iş kuralı TÜRETMEZ.
 *
 * 🔴 Görsel kapı kuralı (`budget/preview-geometry.ts` ile AYNI): çıkan her
 * koordinat `Math.round`lanır — kesirli piksel turdan tura farklı yuvarlanıp
 * baseline'ı oynatır.
 */

/** Eşit aralıklı bir dizi indeksini `[left, right]` aralığına eşler. */
export function indexScale(index: number, count: number, left: number, right: number): number {
  if (count <= 1) return Math.round(left);
  return Math.round(left + (index / (count - 1)) * (right - left));
}

/**
 * `indexScale`in TERSİ — fare/dokunuş konumundan (viewBox birimi) en yakın
 * NOKTA indeksini bulur (etkileşimli grafik hover'ı, emsal `budget/
 * preview-geometry.ts sCurveIndexAt`). Aralık dışına taşan konum en yakın
 * uca KISTIRILIR — grafiğin solunda/sağında sürüklenen fare son/ilk noktaya
 * "yapışır", `undefined` DÖNMEZ.
 */
export function indexAt(viewX: number, count: number, left: number, right: number): number {
  if (count <= 1) return 0;
  const t = right === left ? 0 : (viewX - left) / (right - left);
  return Math.round(Math.max(0, Math.min(1, t)) * (count - 1));
}

/**
 * `bandScale`in TERSİ — fare konumundan en yakın BAND indeksini bulur
 * (çubuk grafikler: günlük çift çubuk, histogram).
 */
export function bandIndexAt(viewX: number, count: number, left: number, right: number): number {
  if (count <= 0) return 0;
  const slot = (right - left) / count;
  const i = slot === 0 ? 0 : Math.floor((viewX - left) / slot);
  return Math.max(0, Math.min(count - 1, i));
}

/** Bir bandın (çubuk aralığının) sol kenarını eşler — `count` bant genişliğinde. */
export function bandScale(index: number, count: number, left: number, right: number): number {
  const slot = (right - left) / Math.max(1, count);
  return Math.round(left + index * slot);
}

export function bandWidth(count: number, left: number, right: number): number {
  return (right - left) / Math.max(1, count);
}

/** Değer eksenini `[top, base]`e ters çevirerek eşler (SVG'de y aşağı büyür). */
export function valueScale(value: number, min: number, max: number, top: number, base: number): number {
  if (max <= min) return Math.round(base);
  const clamped = Math.max(min, Math.min(max, value));
  return Math.round(base - ((clamped - min) / (max - min)) * (base - top));
}

/**
 * Belirli sayıda eşit aralıklı indeks seçer (etiket kalabalığını önlemek
 * için) — İLK ve SON indeks HER ZAMAN dahildir.
 */
export function tickIndices(count: number, maxTicks: number): number[] {
  if (count <= 0) return [];
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (maxTicks - 1);
  const out = new Set<number>();
  for (let k = 0; k < maxTicks; k += 1) out.add(Math.round(k * step));
  return [...out].sort((a, b) => a - b);
}

/** İki eğrinin karşılaştırmalı dolgusu — ileride/geride parçalarına böler. */
export interface FillSplit {
  /** `top >= base` olan parçalar (İLERİDE/yeşil). */
  ahead: string;
  /** `top < base` olan parçalar (GERİDE/kırmızı). */
  behind: string;
}

/**
 * `top`/`base` aynı uzunlukta iki dizi (x koordinatları `xs`ten). İki eğrinin
 * KESİŞTİĞİ her noktada parça bölünür (doğrusal enterpolasyonla kesişim
 * x'i bulunur) — aksi hâlde kesişim civarında dolgu ÜÇGENSİ yanlış tarafa
 * boyanır. Emsal: `budget/preview-geometry.ts` `flush()` (orada tek yönlü,
 * kesişim ENTERPOLASYONU YOKTU — burada eklendi, S3.2b gereksinimi).
 */
export function fillSplit(
  xs: readonly number[],
  top: readonly number[],
  base: readonly number[],
): FillSplit {
  const n = xs.length;
  if (n < 2) return { ahead: "", behind: "" };

  type Seg = { x: number; top: number; base: number };
  const segments: Seg[] = xs.map((x, i) => ({ x, top: top[i] ?? 0, base: base[i] ?? 0 }));

  // 🔴 Kesişim noktasında top===base (sınır belirsiz) — bir koşunun
  // İLERİDE/GERİDE'liği o koşunun İÇİNDEKİ (sınır olmayan) bir noktadan
  // belirlenir, koşunun İLK noktasından DEĞİL (o, önceki koşudan devralınan
  // kesişim noktası olabilir ve top===base'de `>=` HER ZAMAN true döner —
  // "geride biten" koşu yanlışlıkla "ileride" sayılırdı).
  const runs: { segs: Seg[]; ahead: boolean }[] = [];
  const aheadAt = (s: Seg) => s.top >= s.base;
  let current: Seg[] = [segments[0]!];
  let currentAhead = aheadAt(segments[0]!);

  for (let i = 1; i < segments.length; i += 1) {
    const prev = segments[i - 1]!;
    const cur = segments[i]!;
    if (aheadAt(prev) !== aheadAt(cur)) {
      const dPrev = prev.top - prev.base;
      const dCur = cur.top - cur.base;
      const denom = dPrev - dCur;
      const t = denom === 0 ? 0.5 : dPrev / denom;
      const crossX = prev.x + (cur.x - prev.x) * t;
      const crossVal = prev.top + (cur.top - prev.top) * t;
      const crossPoint: Seg = { x: crossX, top: crossVal, base: crossVal };
      current.push(crossPoint);
      runs.push({ segs: current, ahead: currentAhead });
      current = [crossPoint, cur];
      currentAhead = aheadAt(cur);
    } else {
      current.push(cur);
    }
  }
  runs.push({ segs: current, ahead: currentAhead });

  let ahead = "";
  let behind = "";
  for (const run of runs) {
    if (run.segs.length < 2) continue;
    const up = run.segs.map((s, i) => `${i === 0 ? "M" : "L"}${round(s.x)} ${round(s.top)}`).join("");
    const down = [...run.segs]
      .reverse()
      .map((s) => `L${round(s.x)} ${round(s.base)}`)
      .join("");
    const path = `${up}${down}Z`;
    if (run.ahead) ahead += path;
    else behind += path;
  }
  return { ahead, behind };
}

function round(n: number): number {
  return Math.round(n);
}
