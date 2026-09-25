import type { QueryClient } from "@tanstack/react-query";

import { EV_DAY_KEYS } from "./useEvDay";
import { SITE_DIARY_ENTRIES_QUERY_KEY, SITE_DIARY_ENTRY_QUERY_KEY } from "./useSiteDiary";
import { TIMESHEET_QUERY_KEY, TIMESHEET_WEEK_QUERY_KEY } from "./useTimesheet";

/**
 * PLN-F3.1-ek · "gün kilidi değişti" tazeleme kümesinin TEK kaynağı.
 *
 * `useUnlockDay` (kilidi aç) VE `useApproveDailyReport` (onayla → kilitle)
 * AYNI kilit bağını değiştirir — onay unlock'un TERSİDİR. Liste bir kez
 * `useUnlockDay`de yazılmış, ikinci mutasyon (approve) eklenirken üçü
 * (günlük kayıt listesi/tekil kayıt, aylık puantaj) KOPYALANMADAN unutulmuştu:
 * onaydan sonra günlük kayıt ve aylık puantaj görünümü YANLIŞLIKLA hâlâ
 * kilitsiz görünüyordu. Liste burada TEK yerde durduğu için ikisi ARTIK
 * ayrışamaz.
 */
export function invalidateDayLockQueries(client: QueryClient, siteId: string): void {
  void client.invalidateQueries({ queryKey: [EV_DAY_KEYS.day, siteId] });
  void client.invalidateQueries({ queryKey: [SITE_DIARY_ENTRIES_QUERY_KEY, siteId] });
  void client.invalidateQueries({ queryKey: [SITE_DIARY_ENTRY_QUERY_KEY] });
  void client.invalidateQueries({ queryKey: [TIMESHEET_WEEK_QUERY_KEY, siteId] });
  void client.invalidateQueries({ queryKey: [TIMESHEET_QUERY_KEY, siteId] });
}
