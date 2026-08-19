"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import {
  FINANCIAL_INSTRUMENT_LIST_MAX_LIMIT,
  useFinancialInstruments,
  useFinancialInstrumentSummary,
} from "@/lib/api/hooks/useFinancialInstruments";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";

import { InstrumentSummaryCards } from "./InstrumentSummaryCards";
import { InstrumentsTable } from "./InstrumentsTable";
import {
  FINANCIAL_INSTRUMENT_PERMISSION_MODULE,
  INSTRUMENT_TABS,
  instrumentSerialColumnLabel,
  instrumentTabFilter,
  instrumentTabFromParam,
} from "./financial-instrument-labels";
import "./financial-instruments.css";

const TAB_PARAM = "sekme";

/**
 * 🔴 E10:65 "+ Çek Ekle" — UÇ VARDIR (`POST /financial-instruments`), FORM
 * YOKTUR: mockup düğmeyi çizmiş ama açılınca görünecek formu ÇİZMEMİŞTİR
 * (openapi şeması bunu açıkça yazar). Kanon (F-TH · F-HZ "+ Ödeme Planla"):
 * *rotası/mockup'ı olmayan mockup öğesi SİLİNMEZ, DEVRE DIŞI basılır* —
 * uydurma form açılmaz.
 */
const ADD_DISABLED_HINT = "Çek/senet ekleme formunun tasarımı bekleniyor.";

/**
 * F-FIN · `/hazine/cek-senet` — mockup `Ekran 10 - Finans Çek Ödeme.dc.html`
 * (E10, kanonik). Yorumlardaki sayılar O dosyanın SATIR numaralarıdır.
 *
 * Mockup'ın KENDİ üst barı (E10:20-33) ve sol menüsü (E10:36-59) BASILMAZ:
 * kabuk canon kazanır (F3 Topbar + Sidebar).
 *
 * ⚠️ İKİ BAĞIMSIZ VERİ KAYNAĞI: özet kartları (`/summary`) ve liste
 * (`/financial-instruments`). Her biri KENDİ yükleme/hata yolunu işletir —
 * biri patlayınca öteki yaşamaya devam eder.
 *
 * ⚠️ SEKME SÜZGECİ SUNUCUYA GİDER; istemcide süzülen hiçbir şey YOKTUR, aksi
 * hâlde sayfalanan kümenin dışındaki kayıtlar sessizce kaybolurdu.
 */
export function FinancialInstrumentsView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const permission = useModulePermission(FINANCIAL_INSTRUMENT_PERMISSION_MODULE);

  const tab = instrumentTabFromParam(searchParams.get(TAB_PARAM));

  const summaryQuery = useFinancialInstrumentSummary();
  // Kırpma korkuluğu (TB3/F-TH): tavan AÇIKÇA gönderilir, eksik kalan kayıt
  // `total` üzerinden GÖRÜNÜR bir bantla bildirilir — sessizce kırpılmaz.
  // 🔴 E10 sayfalama çubuğu ÇİZMEZ (mockup kazanır, K5) — bu yüzden çubuk
  // EKLENMEDİ; tavanı aşan portföy bandı görür.
  const listQuery = useFinancialInstruments({
    ...instrumentTabFilter(tab),
    limit: FINANCIAL_INSTRUMENT_LIST_MAX_LIMIT,
  });

  if (!permission.canView || isForbidden(listQuery.error) || isForbidden(summaryQuery.error)) {
    return <AccessDenied />;
  }

  const rows = listQuery.data?.items;
  const truncation = buildListTruncation(rows?.length ?? 0, listQuery.data?.total);

  function selectTab(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "alinan") params.delete(TAB_PARAM);
    else params.set(TAB_PARAM, next);
    const query = params.toString();
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="fin">
      {/* E10:62 */}
      <p className="fin__eyebrow">Hazine · Çek &amp; Senet Yönetimi</p>

      {/* E10:63-66 */}
      <div className="fin__head">
        <h1 className="fin__title">Çek &amp; Ödeme</h1>
        {/* E10:65 — devre dışı, gerekçesi hem `title` hem `sr-only` ile taşınır
            ve altta GÖRÜNÜR bir bant tekrarlar (F-HZ emsali). */}
        <Button variant="primary" disabled title={ADD_DISABLED_HINT} data-testid="fin-add">
          + Çek Ekle<span className="sr-only"> — {ADD_DISABLED_HINT}</span>
        </Button>
      </div>
      <p className="fin-notice" data-testid="fin-add-reason">
        {ADD_DISABLED_HINT}
      </p>

      {/* E10:69-90 — dört kart, kendi hata yolu. */}
      {summaryQuery.isError && (
        <p className="fin-notice fin-notice--danger" data-testid="fin-summary-error">
          {backendErrorMessage(summaryQuery.error, "Özet kartları yüklenemedi.")}
        </p>
      )}
      <InstrumentSummaryCards summary={summaryQuery.data} />

      {/* E10:93-97 — ÜÇ sekme; ayrı uç DEĞİL, süzgeç. */}
      <div className="fin-tabs" role="tablist" aria-label="Kıymetli evrak sekmeleri">
        {INSTRUMENT_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="fin-tab"
            aria-current={tab === item.key ? "page" : undefined}
            data-testid={`fin-tab-${item.key}`}
            onClick={() => selectTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* E10:99-161 */}
      {truncation.isTruncated && (
        <p className="fin-notice" data-testid="fin-truncation">
          {listTruncationMessage(truncation)}
        </p>
      )}
      <InstrumentsTable
        rows={rows}
        serialColumnLabel={instrumentSerialColumnLabel(tab)}
        isLoading={listQuery.isLoading}
        errorMessage={
          listQuery.isError
            ? backendErrorMessage(listQuery.error, "Çek/senet listesi yüklenemedi.")
            : undefined
        }
      />

      {/* Görsel spec "yüklendi" iddiasını KAYNAK BAŞINA kurar — tek bayrak
          ikinci kaynağın hâlâ pending olduğunu GİZLERDİ (F-İK dersi). */}
      {summaryQuery.data !== undefined && <span hidden data-testid="fin-loaded-summary" />}
      {listQuery.data !== undefined && <span hidden data-testid="fin-loaded-list" />}
    </div>
  );
}
