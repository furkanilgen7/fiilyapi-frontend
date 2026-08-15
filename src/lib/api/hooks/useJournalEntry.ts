import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";

import { JOURNAL_ENTRIES_QUERY_KEY, type JournalEntryDetailResponse } from "./useJournalEntries";

/**
 * F-MU1 T4 · `GET /journal-entries/{id}` — başlık **+ bacaklar**.
 *
 * 🔴 Liste ucu (`useJournalEntries`) yalnız BAŞLIK döner (`JournalEntryListResponse`
 * şema notu: satır taşımak listeyi N+1'e sokardı). Düzenleme diyaloğu bacakları
 * gösterecekse onları BURADAN çekmek zorundadır — listedeki toplamlardan satır
 * kümesini geri üretmek imkânsızdır.
 *
 * Anahtar liste anahtarının ALTINDA kurulur (`[JOURNAL_ENTRIES_QUERY_KEY, id]`):
 * `invalidateAccountingScope` önek eşleşmesiyle bu okumayı da bayatlatır, ayrı
 * bir geçersizleştirme yazılmaz (aynı formül iki yerde yaşamaz).
 */
export function useJournalEntry(
  entryId: string | null,
): UseQueryResult<JournalEntryDetailResponse, Error> {
  return useQuery({
    // `null` kimlikte ağa HİÇ çıkılmaz; diyalog kapalıyken sorgu uyanmaz.
    enabled: entryId !== null,
    queryKey: [JOURNAL_ENTRIES_QUERY_KEY, entryId],
    queryFn: async () => {
      // `enabled` bunu zaten engeller; yine de dar tip için AÇIK dal — `as`
      // ile susturmak, kapı bir gün gevşerse hatayı görünmez kılardı.
      if (entryId === null) throw new Error("Fiş kimliği yok.");
      return unwrap(
        await backendClient.GET("/journal-entries/{entry_id}", {
          params: { path: { entry_id: entryId } },
        }),
      );
    },
  });
}
