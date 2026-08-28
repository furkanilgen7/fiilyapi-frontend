"use client";

import { useMemo } from "react";

import {
  usePersonnel,
  PERSONNEL_MAX_LIMIT,
  type PersonnelListItem,
} from "@/lib/api/hooks/usePersonnel";
import { useTimesheetWeek, type TimesheetWeek } from "@/lib/api/hooks/useTimesheet";
import { isForbidden } from "@/lib/api/unwrap";
import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

import type { TimesheetIsoWeek } from "./iso-week";
import { EMPTY_TIMESHEET_DRAFT, type TimesheetDraft } from "./timesheet-draft";
import {
  buildTimesheetWeekView,
  type TimesheetWeekDerived,
  type TimesheetWeekViewRow,
} from "./week-derive";

/** Uç `normal_day_hours` vermeden önce hiçbir renk eşiği UYDURULMAZ. */
export const FALLBACK_NORMAL_DAY_HOURS = "9";

export interface UseTimesheetWeekDataInput {
  siteId: string;
  week: TimesheetIsoWeek;
  /** Görünüm süzgeci — `null` = Tüm Bölümler. AĞA GİTMEZ (K2). */
  sectionId: string | null;
  /** Ek görünüm süzgeçleri (meslek/tür/taşeron) — YALNIZ satırları eler. */
  rowFilter?: (row: TimesheetWeekViewRow) => boolean;
  /** Kaydedilmemiş yerel düzenlemeler — türevlere anında yansır. */
  draft?: TimesheetDraft;
}

export interface TimesheetWeekDataState {
  view: TimesheetWeekDerived;
  /** Ham yanıt — hafta şeridi, KPI eşikleri ve ay bilgisi buradan okunur. */
  weekData: TimesheetWeek | undefined;
  /** Renk/legend eşiği (`normal_day_hours`); yanıt yokken güvenli varsayılan. */
  normalDayHours: string;
  isLoading: boolean;
  isError: boolean;
  /** YALNIZ hafta ucunun 403'ü sayfayı kapatır. */
  isForbidden: boolean;
  /** Kartoteks okunamadı: ekran KIRILMAZ, hücresiz personel satır alamaz. */
  isPersonnelUnavailable: boolean;
  personnelTruncation: ListTruncation;
  /** Süzgeçten ÖNCEKİ satır sayısı — "Gösterilen 4 / 48" için (E5 123-127). */
  totalRowCount: number;
}

/**
 * İki puantaj ekranının ORTAK veri katmanı (PUAN-SAAT).
 *
 * ⚠️ ŞEF KARARI K2: `useTimesheetWeek`e `section_id` GEÇİRİLMEZ — hafta HER
 * ZAMAN süzgeçsiz çekilir, bölüm filtresi yalnız `buildTimesheetWeekView`
 * içinde GÖRÜNÜME uygulanır. Süzgeçli küme kaydetme gövdesine sızarsa diğer
 * bölümlerin o haftası SİLİNİR (uç DEĞİŞTİRME semantiği).
 *
 * ⚠️ ŞEF KARARI K1: satırlar `GET /personnel?is_active=true` kartoteksinden
 * kurulur (`limit` AÇIKÇA geçirilir; varsayılan 50'ye güvenip 51. personeli
 * kaybetmek en kolay hatadır).
 */
export function useTimesheetWeekData({
  siteId,
  week,
  sectionId,
  rowFilter,
  draft = EMPTY_TIMESHEET_DRAFT,
}: UseTimesheetWeekDataInput): TimesheetWeekDataState {
  const personnelQuery = usePersonnel({ isActive: true, limit: PERSONNEL_MAX_LIMIT });
  const weekQuery = useTimesheetWeek(siteId, week);

  const personnel: PersonnelListItem[] | undefined = personnelQuery.data?.items;
  const weekData = weekQuery.data;

  const view = useMemo(
    () => buildTimesheetWeekView({ week, personnel, weekData, sectionId, rowFilter, draft }),
    [week, personnel, weekData, sectionId, rowFilter, draft],
  );
  // Süzgeçsiz satır sayısı — "Gösterilen N / M" sayacının paydası.
  const unfiltered = useMemo(
    () => buildTimesheetWeekView({ week, personnel, weekData, sectionId, draft }),
    [week, personnel, weekData, sectionId, draft],
  );

  return {
    view,
    weekData,
    normalDayHours: weekData?.normal_day_hours ?? FALLBACK_NORMAL_DAY_HOURS,
    isLoading: weekQuery.isLoading,
    isError: weekQuery.isError,
    // `personnel` AYRI bir izin modülüdür (`personnel` ≠ `timesheet`): kartoteks
    // 403'ü puantaj ekranını KAPATMAZ. Sayfayı yalnız hafta ucunun 403'ü kapatır.
    isForbidden: isForbidden(weekQuery.error),
    isPersonnelUnavailable: personnelQuery.isError,
    personnelTruncation: buildListTruncation(personnel?.length ?? 0, personnelQuery.data?.total),
    totalRowCount: unfiltered.rows.length,
  };
}
