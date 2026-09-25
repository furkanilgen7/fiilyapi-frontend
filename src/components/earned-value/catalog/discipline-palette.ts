/**
 * PLN-F1.5 · Disiplin grafik paleti — VERİ, stil değil.
 *
 * Seçilen renk backend'e `color` (`^#[0-9A-Fa-f]{6}$`) olarak yazılır ve
 * grafiklerde veriden basılır (`style={{ background: color }}`); bu yüzden
 * CSS token'ı DEĞİL, hex dizisidir.
 *
 * Kaynak: `Planlama - Adam-Saat Bütçesi.dc.html:523` (DISC[].c, beş renk aynen).
 * KARARLAR-BEKLEYEN §11.b: türetilmiş mockup'taki 8'li genişleme (Disiplin
 * Yönetimi.dc.html:404) TASARIMCI onayı bekliyor → uygulama 5 renkle başlar,
 * 6.+ disiplinde palet başa döner; aynı renk iki disipline verilebilir (F0-7).
 */
export const DISCIPLINE_PALETTE: readonly string[] = [
  "#2563eb",
  "#93c5fd",
  "#64748b",
  "#cbd5e1",
  "#e2e8f0",
];
