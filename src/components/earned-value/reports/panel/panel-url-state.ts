"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { isValidIsoDate } from "@/components/site-diary/derive";
import { toIstanbulDateOnly } from "@/lib/format";
import type { ContractorFilter, PanelRange } from "@/lib/api/hooks/useEvReports";

/**
 * PLN-F3.3 · Planlama Paneli'nin `?tarih&aralik&disiplin&yuklenici` URL
 * durumu — `useDailyReportUrlState` (C, F3.4) ile AYNI desen: `router.replace`
 * + `scroll: false`, geçmiş/ileri gitmede URL TEK kaynak.
 *
 * Disiplin seçenekleri raporun KENDİ `disciplines[]` alanından gelir ve bu
 * filtreden BAĞIMSIZDIR (lider notu) — bu dosya yalnız
 * URL OKUR/YAZAR, seçenek listesini bilmez.
 */
const DATE_PARAM = "tarih";
const RANGE_PARAM = "aralik";
const DISCIPLINE_PARAM = "disiplin";
const OWNER_PARAM = "yuklenici";

const RANGES: readonly PanelRange[] = ["4w", "3m", "all"];
const OWNERS: readonly ContractorFilter[] = ["own", "subcon"];
const DEFAULT_RANGE: PanelRange = "4w";

/** Europe/Istanbul takvim günü — `?tarih=` verilmediğinde varsayılan (S15 ile AYNI). */
export function todayIso(): string {
  return toIstanbulDateOnly(new Date().toISOString());
}

function parseRange(raw: string | null): PanelRange {
  return (RANGES as readonly string[]).includes(raw ?? "") ? (raw as PanelRange) : DEFAULT_RANGE;
}

function parseOwner(raw: string | null): ContractorFilter | null {
  return (OWNERS as readonly string[]).includes(raw ?? "") ? (raw as ContractorFilter) : null;
}

export interface PanelUrlState {
  date: string;
  range: PanelRange;
  /** `null` = "Tüm disiplinler". */
  disciplineId: string | null;
  /** `null` = "Hepsi" (kendi + taşeron). */
  contractorType: ContractorFilter | null;
  setDate: (next: string) => void;
  setRange: (next: PanelRange) => void;
  setDisciplineId: (next: string | null) => void;
  setContractorType: (next: ContractorFilter | null) => void;
}

export function usePanelUrlState(): PanelUrlState {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawDate = searchParams.get(DATE_PARAM);
  const date = rawDate !== null && isValidIsoDate(rawDate) ? rawDate : todayIso();
  const range = parseRange(searchParams.get(RANGE_PARAM));
  const disciplineId = searchParams.get(DISCIPLINE_PARAM);
  const contractorType = parseOwner(searchParams.get(OWNER_PARAM));

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return {
    date,
    range,
    disciplineId,
    contractorType,
    setDate: (next) => setParam(DATE_PARAM, next),
    setRange: (next) => setParam(RANGE_PARAM, next),
    setDisciplineId: (next) => setParam(DISCIPLINE_PARAM, next),
    setContractorType: (next) => setParam(OWNER_PARAM, next),
  };
}
