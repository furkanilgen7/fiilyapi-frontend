"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { isValidIsoDate } from "@/components/site-diary/derive";
import { toIstanbulDateOnly } from "@/lib/format";

/** `?tarih=` parametre adı — F3-SÖZLEŞME §2 "GİR `?tarih=`". */
const DATE_PARAM = "tarih";

/** Europe/Istanbul takvim günü — `?tarih=` verilmediğinde varsayılan (S15). */
export function todayIso(): string {
  return toIstanbulDateOnly(new Date().toISOString());
}

/**
 * PLN-F3.4 (S15) · GİR'in `?tarih=` URL durumu — `useBudgetUrlState` (Bütçe)
 * ile AYNI desen: `router.replace` + `scroll: false`, geçmiş/ileri gitmede
 * URL tek kaynak. Eksik ya da bozuk parametre → bugün (Europe/Istanbul).
 */
export function useDailyReportUrlState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get(DATE_PARAM);
  const date = raw !== null && isValidIsoDate(raw) ? raw : todayIso();

  const setDate = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(DATE_PARAM, next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { date, setDate };
}
