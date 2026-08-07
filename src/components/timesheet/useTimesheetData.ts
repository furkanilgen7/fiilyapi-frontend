"use client";

import { useMemo } from "react";

import {
  usePersonnel,
  PERSONNEL_MAX_LIMIT,
  type PersonnelListItem,
} from "@/lib/api/hooks/usePersonnel";
import { useTimesheet, type TimesheetPeriod } from "@/lib/api/hooks/useTimesheet";
import { isForbidden } from "@/lib/api/unwrap";
import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

import { buildTimesheetView, type TimesheetDerived } from "./derive";

export interface UseTimesheetDataInput {
  siteId: string;
  period: TimesheetPeriod;
  /** Görünüm süzgeci — `null` = Tüm Bölümler. AĞA GİTMEZ (K2). */
  sectionId: string | null;
}

export interface TimesheetDataState {
  view: TimesheetDerived;
  isLoading: boolean;
  /** Matris ucunun hatası — ekranın gövdesi bunda basılamaz. */
  isError: boolean;
  /** YALNIZ matris 403'ü sayfayı kapatır (aşağıdaki nota bakınız). */
  isForbidden: boolean;
  /**
   * Kartoteks okunamadı (403 dahil): ekran KIRILMAZ, yalnız hücresi olmayan
   * personel satır alamaz. Görünür Türkçe gerekçe için.
   */
  isPersonnelUnavailable: boolean;
  /** `GET /personnel` sunucu tavanında kırpıldıysa görünür uyarı için. */
  personnelTruncation: ListTruncation;
}

/**
 * İki puantaj ekranının ORTAK veri katmanı (F-PT T2).
 *
 * ⚠️ ŞEF KARARI K2 — `useTimesheet` ÜÇÜNCÜ ARGÜMANI (`sectionId`) BİLEREK
 * VERİLMEZ: `GET .../timesheet` HER ZAMAN SÜZGEÇSİZ çekilir, bölüm filtresi
 * yalnız `buildTimesheetView` içinde GÖRÜNÜME uygulanır. Gerekçe `derive.ts`
 * başındadır: `PUT` dönem+şantiye kapsamında DEĞİŞTİRMEDİR, süzgeçli küme
 * kaydedilirse diğer bölümlerin kayıtları silinir. Buraya `section_id`
 * eklemek T3'ün kaydetme gövdesini yapısal olarak eksik bırakır.
 *
 * ⚠️ ŞEF KARARI K1 — satırlar `GET /personnel?is_active=true` kartoteksinden
 * kurulur (`limit` AÇIKÇA geçirilir; varsayılan 50'ye güvenip 51. personeli
 * kaybetmek en kolay hatadır).
 */
export function useTimesheetData({
  siteId,
  period,
  sectionId,
}: UseTimesheetDataInput): TimesheetDataState {
  const personnelQuery = usePersonnel({ isActive: true, limit: PERSONNEL_MAX_LIMIT });
  const matrixQuery = useTimesheet(siteId, period);

  const personnel: PersonnelListItem[] | undefined = personnelQuery.data?.items;
  const matrix = matrixQuery.data;

  const view = useMemo(
    () =>
      buildTimesheetView({
        year: period.year,
        month: period.month,
        personnel,
        matrix,
        sectionId,
      }),
    [period.year, period.month, personnel, matrix, sectionId],
  );

  return {
    view,
    isLoading: matrixQuery.isLoading,
    isError: matrixQuery.isError,
    // `personnel` AYRI bir izin modülüdür (`personnel` ≠ `timesheet`): kartoteks
    // 403'ü puantaj ekranını KAPATMAZ — matris zaten kendi satırlarını taşır.
    // Sayfayı yalnız matrisin kendi 403'ü kapatır.
    isForbidden: isForbidden(matrixQuery.error),
    isPersonnelUnavailable: personnelQuery.isError,
    personnelTruncation: buildListTruncation(
      personnel?.length ?? 0,
      personnelQuery.data?.total,
    ),
  };
}
