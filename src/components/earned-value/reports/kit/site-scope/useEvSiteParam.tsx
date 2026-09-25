"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useEvSiteOptions, type EvSiteOption, type EvSiteOptionsState } from "@/lib/api/hooks/useEvSettings";

import { EvSitePicker } from "./EvSitePicker";

/**
 * PLN-F3.6a · Rapor ekranlarının (Panel/GİR/QURR) KÖK İKİZLERİNİN ORTAK
 * şantiye durumu (S21). `GeneralManHourBudgetView`in kendi içinde yazdığı
 * `?site=` seçici deseni buraya ÇIKARILDI — Bütçe TAŞINMADI (ayrı iş,
 * kendi dosyasında kalır), burada YENİ kod ORTAK bir kit olarak yazıldı.
 *
 * Desen (Bütçe/`GeneralSiteDiaryView` ile BİREBİR):
 *   • `?site=` yoksa ilk DEVAM EDEN şantiye; hepsi tamamlanmışsa ilk seçenek.
 *   • Çözülemeyen/eksik `?site=` URL'e GERİ YAZILIR (adres ile ekran çelişmez).
 *   • Kullanıcı elle şantiye DEĞİŞTİRİRSE diğer sorgu parametreleri (hafta,
 *     tarih…) DÜŞER — önceki şantiyenin takvimine ait değildirler (Bütçe'nin
 *     revizyon/adım anahtarları için yazdığı gerekçenin AYNISI).
 */
export interface UseEvSiteParamOptions {
  /** URL sorgu anahtarı — varsayılan `"site"` (Bütçe/Günlük Kayıt kök ikizleriyle AYNI). */
  paramName?: string;
}

export interface UseEvSiteParamResult {
  siteOptions: EvSiteOptionsState;
  selected: EvSiteOption | undefined;
  /** Başlıktaki hazır seçici (S21) — çağıran `ReportScreenProps.picker`e geçirir. */
  picker: ReactNode;
}

const DEFAULT_PARAM_NAME = "site";

export function useEvSiteParam(options: UseEvSiteParamOptions = {}): UseEvSiteParamResult {
  const paramName = options.paramName ?? DEFAULT_PARAM_NAME;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteOptions = useEvSiteOptions();
  const siteParam = searchParams.get(paramName);
  const selected =
    siteOptions.options.find((option) => option.siteId === siteParam) ??
    siteOptions.options.find((option) => !option.isCompleted) ??
    siteOptions.options[0];

  function pushSite(siteId: string) {
    const params = new URLSearchParams();
    params.set(paramName, siteId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (selected === undefined || siteParam === selected.siteId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, selected.siteId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.siteId, siteParam]);

  return {
    siteOptions,
    selected,
    picker: <EvSitePicker state={siteOptions} value={selected?.siteId ?? ""} onChange={pushSite} />,
  };
}
