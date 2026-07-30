import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap, isForbidden as isForbiddenError } from "@/lib/api/unwrap";

/**
 * Şantiye formundaki ÜÇ kişi seçicisinin (Şantiye Şefi, İSG Uzmanı, bölüm
 * Sorumlusu) paylaştığı tek sorgu (plan T4, spec §9.2).
 *
 * `useUsers`'ın sayfalı deseni bilinçli olarak KOPYALANMAZ: sunucu tavanı
 * `limit=200`'dür, seçici tek istekle dolar. `useUsers`'ın `PAGE_SIZE = 20`'si
 * o hook'un kendi sayfalama tercihidir, sunucu sınırı değildir.
 *
 * ⚠️ `GET /users` `user_management:view` ister ve bu izin yalnız sistem
 * yöneticisindedir. Diğer YEDİ rolde uç 403 döner — bu bir hata değil, KABUL
 * EDİLMİŞ SINIRLAMADIR (plan TZ-4b). Bu yüzden 403 ayrı bir durum olarak
 * yayımlanır: tüketici "yetkiniz yok" ile "liste yüklenemedi"yi ayırt eder,
 * mesajları farklıdır.
 */
export interface UserOption {
  id: string;
  full_name: string;
  title: string | null;
}

export const USER_OPTIONS_QUERY_KEY = ["user-options"] as const;

// Sunucu tavanı (backend `router.py:40` → `le=200`). Uydurma tavan yazılmaz;
// 200 üstü için sunucu tarafı arama gerekir, o ayrı bir dilimin işidir.
export const USER_OPTIONS_LIMIT = 200;

const MAX_RETRIES = 1;

export type UseUserOptionsResult = UseQueryResult<UserOption[], Error> & {
  /** Sorgu hata verse de her zaman dizi — seçiciler `undefined` görmez. */
  options: UserOption[];
  /** `GET /users` 403 döndü: yetki eksik, liste hiç gelmeyecek. */
  isForbidden: boolean;
};

export function userOptionLabel(user: UserOption): string {
  const title = user.title?.trim();
  return title ? `${user.full_name} (${title})` : user.full_name;
}

export function useUserOptions(): UseUserOptionsResult {
  const query = useQuery<UserOption[], Error>({
    queryKey: USER_OPTIONS_QUERY_KEY,
    // Yetki hatası geçici değildir — 403 yeniden denenmez.
    retry: (failureCount, error) => !isForbiddenError(error) && failureCount < MAX_RETRIES,
    queryFn: async () => {
      const data = unwrap(
        await backendClient.GET("/users", {
          params: { query: { limit: USER_OPTIONS_LIMIT, offset: 0 } },
        }),
      );
      return data.items.map((user) => ({
        id: user.id,
        full_name: user.full_name,
        title: user.title,
      }));
    },
  });

  return {
    ...query,
    options: query.data ?? [],
    isForbidden: isForbiddenError(query.error),
  };
}
