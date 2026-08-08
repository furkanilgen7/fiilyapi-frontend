/**
 * SZL "İlerleme" kolonunun ÇUBUK TONU (mockup 60, 70, 80, 90, 100).
 *
 * Mockup beş satırda DÖRT ayrı ton kullanır ve tonu belirleyen kural yazılı
 * değildir; satırlardan çıkarılır:
 *
 * | satır | % | çubuk | ray zemini | yüzde metni |
 * |---|---|---|---|---|
 * | 60  | 75  | `#2563eb` mavi | `#f1f5f9` | `#94a3b8` sönük |
 * | 70  | 100 | `#16a34a` yeşil | `#dcfce7` YEŞİL RAY | `#16a34a` |
 * | 80  | 58  | `#2563eb` mavi | `#f1f5f9` | `#94a3b8` sönük |
 * | 90  | 42  | `#f59e0b` kehribar | `#f1f5f9` | `#f59e0b` |
 * | 100 | 88  | `#8b5cf6` mor | `#f1f5f9` | `#8b5cf6` |
 *
 * DURUMLA (Aktif/Tamamlandı/Beklemede) açıklanamaz: 100. satır "Aktif" olduğu
 * hâlde 60/80'den FARKLI (mor) bir ton taşır. YÜZDEYLE ise beş satırın BEŞİ
 * de açıklanır (100 → yeşil, 80+ → mor, 50+ → mavi, altı → kehribar) — ray
 * zemini ve yüzde metni renkleri de aynı kuralla düşer. Bu yüzden eşik
 * kuralı seçildi.
 *
 * ⚠️ Eşiklerin KESİN yeri mockup'tan çıkarılamaz: örneklerden okunabilen tek
 * şey sınırın (42, 58] ve (75, 88] aralıklarında olduğudur; 50 ve 80 yuvarlak
 * değerler olduğu için seçildi. Bu belirsizlik rapora yazıldı.
 */
export type ContractProgressTone = "complete" | "high" | "mid" | "low";

const COMPLETE_THRESHOLD = 100;
const HIGH_THRESHOLD = 80;
const MID_THRESHOLD = 50;

export function contractProgressTone(pct: number): ContractProgressTone {
  if (pct >= COMPLETE_THRESHOLD) return "complete";
  if (pct >= HIGH_THRESHOLD) return "high";
  if (pct >= MID_THRESHOLD) return "mid";
  return "low";
}

/** Çubuk genişliği yüzde metni olarak; 0-100 aralığına kırpılır. */
export function contractProgressWidth(pct: number): string {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return `${clamped}%`;
}
