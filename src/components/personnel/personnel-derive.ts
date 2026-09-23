import type { PersonnelListItem } from "@/lib/api/hooks/usePersonnel";

/**
 * F-PT2 T1 · K-F — Personel liste ekraninin SAF turev modulu (React yok,
 * ag cagrisi yok, mutasyon yok). Spec K-B/K-C/K-E'nin uyguladigi is
 * mantigi burada yasar; T2 bunu YALNIZ TUKETIR.
 *
 * Sef karari (görev emri K-B/K-C): backend `GET /personnel` `trade`
 * (meslek) suzgeci VERMEZ — `q`/`is_active` sunucuya gider, meslek
 * secenekleri yuklenen kadrodaki AYRIK `trade` degerlerinden turetilip
 * ISTEMCIDE suzulur. `total > items.length` oldugunda (kirpilma) liste
 * TURETIMLERI (Sirket/Taseron KPI sayilari) pending'e duser — `total`in
 * kendisi sunucu gercegi oldugu icin GERCEK kalir (spec K-C).
 */
export type PersonnelDeriveItem = PersonnelListItem;

export interface PersonnelKpis {
  /** Sunucunun `total`i — kirpilmada bile GERCEK (liste TUREVI degil). */
  total: number;
  /** `total > items.length` — Sirket/Taseron sayilari bu yuzden pending. */
  isClipped: boolean;
  /** Kirpilma varsa `null` (pending zarfi ekranin gorevi). */
  companyCount: number | null;
  subcontractorCount: number | null;
  /**
   * Kayıt 162 — `WorkerSource` beş değerlidir (`company`/`subcontractor`/
   * `general`/`freelance`/`intern`); şirket+taşeron DIŞINDAKİ üç kaynak
   * önceden hiçbir kartta sayılmıyordu (sessizce KAYBOLUYORDU). Bu üçü
   * burada toplanır; kirpilmada aynı pending kuralına tabidir.
   */
  otherSourceCount: number | null;
}

const COMPANY_SUBCONTRACTOR_SOURCES = new Set(["company", "subcontractor"]);

/**
 * KPI seridinin uc TUREV degeri: Toplam (sunucu `total`i) + Sirket/Taseron
 * sayilari (yuklenen `items`ten sayilir). Kirpilma korkuluğu: `items.length`
 * `total`den KUCUKSE (backend'in tavanina takilmis) sayim EKSIK kayittan
 * hesaplanacagi icin Sirket/Taseron pending'e duser.
 *
 * Kayıt 160 — `isClipped` OPSİYONEL 3. parametre olarak DIŞARIDAN da
 * geçilebilir: `PersonnelListView` meslek süzgeciyle daralmış `items`
 * (`filteredItems`) verirken "kırpılma" GERÇEK sunucu tavanını (serverItems
 * vs serverTotal) anlatmalı, meslek süzgecinin kendisi kırpılma SAYILMAZ.
 * Varsayılan (parametre verilmezse) ESKİ davranışla AYNIdır.
 */
export function deriveKpis(
  items: readonly PersonnelDeriveItem[],
  total: number,
  isClipped: boolean = total > items.length,
): PersonnelKpis {
  if (isClipped) {
    return { total, isClipped, companyCount: null, subcontractorCount: null, otherSourceCount: null };
  }
  const companyCount = items.filter((item) => item.source === "company").length;
  const subcontractorCount = items.filter((item) => item.source === "subcontractor").length;
  const otherSourceCount = items.filter((item) => !COMPANY_SUBCONTRACTOR_SOURCES.has(item.source)).length;
  return { total, isClipped, companyCount, subcontractorCount, otherSourceCount };
}

/**
 * Yuklenen kadrodaki AYRIK meslek degerleri — alfabetik (`tr` locale)
 * siralanir. Bos/null `trade` degerleri secenek listesine GIRMEZ (backend'de
 * katalog tablosu yok, serbest metin — bos deger bir "meslek" DEGILDIR).
 */
export function deriveTradeOptions(items: readonly PersonnelDeriveItem[]): string[] {
  const distinct = new Set<string>();
  for (const item of items) {
    if (item.trade) distinct.add(item.trade);
  }
  return [...distinct].sort((a, b) => a.localeCompare(b, "tr"));
}

/**
 * Meslek suzgeci — ISTEMCIDE uygulanir (spec K-B: backend parametresi yok).
 * `trade` verilmezse ("Tumu") girdi AYNEN doner; girdi dizisi MUTASYONA
 * UGRATILMAZ.
 */
export function filterByTrade(
  items: readonly PersonnelDeriveItem[],
  trade: string | undefined,
): PersonnelDeriveItem[] {
  if (!trade) return [...items];
  return items.filter((item) => item.trade === trade);
}

export interface PersonnelClientPage {
  pageItems: PersonnelDeriveItem[];
  totalPages: number;
}

/**
 * Istemci-tarafi sayfalama (spec K-E: tum kadro TEK istekte cekildigi icin
 * sunucu `offset` turlamasi YAPILMAZ). `page` 1-tabanlidir.
 */
export function paginateClientSide(
  items: readonly PersonnelDeriveItem[],
  page: number,
  pageSize: number,
): PersonnelClientPage {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), totalPages };
}
