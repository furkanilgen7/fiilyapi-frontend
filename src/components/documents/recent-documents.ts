import type { DocumentRead } from "@/lib/api/hooks/useDocuments";

// F-BC T2 · "Son Eklenenler" türetimi (SAF modül).
//
// ⚠️ Sıralama İSTEMCİDEDİR: `GET /documents` bir sıralama parametresi taşımaz
// (backend'in bilinçli sınırı, spec §3). Yanıt sayfalanmadığı için kapsamın
// TAMAMI elimizdedir; en yeni üçü burada seçilir.

/**
 * Mockup "SON EKLENENLER" panelinde ÜÇ satır çizer (ŞB 137-164). Sayı oradan
 * gelir; göz kararı değildir.
 */
export const RECENT_DOCUMENT_COUNT = 3;

/**
 * Kapsamdaki belgelerin en yenileri (tarih azalan).
 *
 * Girdi dizisi DEĞİŞTİRİLMEZ (`sort` yerinde sıralar — önce kopya alınır).
 * Eşit `created_at` değerlerinde kimliğe göre kararlı sıralanır: aynı saniyede
 * yüklenen iki dosyanın satır sırası her renderda aynı kalsın.
 */
export function recentDocuments(
  documents: readonly DocumentRead[],
  limit: number = RECENT_DOCUMENT_COUNT,
): DocumentRead[] {
  return [...documents]
    .sort((a, b) => {
      if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
      return a.id < b.id ? -1 : 1;
    })
    .slice(0, limit);
}
