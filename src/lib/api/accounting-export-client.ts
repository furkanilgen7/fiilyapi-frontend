import { downloadExport, withQuery } from "@/lib/api/download";
import type { ChartAccountFilter } from "@/lib/api/hooks/useChartOfAccounts";
import type { LedgerFilter } from "@/lib/api/hooks/useLedger";

/**
 * EXPORT-XLSX · Muhasebe modülünün ÜÇ Excel dışa aktarma ucu.
 *
 * 🔴 TEK KURAL — DIŞA AKTARIM EKRANIN GÖRDÜĞÜ KÜMEDİR. Her fonksiyon,
 * ekranın LİSTE çağrısını besleyen süzgeç nesnesinin AYNISINI alır ve onu
 * sunucu parametre adlarına çevirir. Ekrandan daha GENİŞ bir dosya üretmek
 * veri sızıntısıdır: kullanıcı süzdüğünü indirdiğini sanır.
 *
 * Bunu yapısal kılmak için süzgeç tipleri BURADA YENİDEN TANIMLANMAZ; ilgili
 * hook'un tipinden (`LedgerFilter`, `ChartAccountFilter`) türetilir. Hook'a bir
 * süzgeç eklenirse tip burada da değişir ve sessizce geride kalamaz.
 *
 * 🔴 İndirme gövdesi `@/lib/api/download` TEK kaynağındadır; bu dosyada yalnız
 * YOL + SORGU + varsayılan ad yaşar.
 *
 * ⚠️ BFF İZİN LİSTESİ: üç ucun ilk path segmenti sırasıyla `trial-balance`,
 * `chart-of-accounts` ve `journal`dır; ÜÇÜ DE `ALLOWED_ROOTS`ta ZATEN vardır
 * (ölçüldü). Yeni kök EKLENMEZ.
 *
 * ⚠️ İKİLİ DAL: üç yol da `export.xlsx` ile biter → BFF `isBinaryResponse`
 * kararını SON SEGMENTten verir (`BINARY_DOWNLOAD_SUFFIXES`), gövde ham geçer.
 */

const TRIAL_BALANCE_EXPORT_PATH = "/api/backend/trial-balance/export.xlsx";
const CHART_EXPORT_PATH = "/api/backend/chart-of-accounts/export.xlsx";
const JOURNAL_EXPORT_PATH = "/api/backend/journal/export.xlsx";

const TRIAL_BALANCE_FILENAME = "mizan.xlsx";
const CHART_FILENAME = "hesap-plani.xlsx";
const JOURNAL_FILENAME = "yevmiye-defteri.xlsx";

/** MZ dönem gezgininin taşıdığı pencere — `year`+`month` ZORUNLU. */
export interface TrialBalanceExportQuery {
  year: number;
  month: number;
}

/**
 * `GET /trial-balance/export.xlsx?year&month`.
 *
 * 🔴 `include_empty` GÖNDERİLMEZ ve bu ekranla BİREBİR aynı karardır:
 * `useTrialBalance` da göndermez, çünkü mockup böyle bir kontrol ÇİZMİYOR ve
 * sunucu varsayılanı `false`tır. Açıkça `false` geçmek aynı sonucu verirdi ama
 * VARSAYILAN YOLU test dışı bırakırdı (MU-2 T6 dersi). Ekranda kontrol
 * olmadığı için ikisi de aynı kümeyi getirir.
 */
export async function downloadTrialBalanceExport(
  query: TrialBalanceExportQuery,
): Promise<void> {
  await downloadExport(
    withQuery(TRIAL_BALANCE_EXPORT_PATH, {
      year: String(query.year),
      month: String(query.month),
    }),
    TRIAL_BALANCE_FILENAME,
  );
}

/**
 * HP süzgeçlerinin sunucu adlarına çevrimi — testin ekran sorgusuyla
 * karşılaştırabilmesi için AYRI ve SAF.
 *
 * 🔴 `limit`/`offset` GEÇMEZ: sayfalama bir SÜZGEÇ DEĞİLDİR. Ekran tavanla
 * (200) tek sayfa çeker ve kırpılmayı görünür bir bantla söyler; Excel'i o
 * tavana kısmak kullanıcının GÖRDÜĞÜNDEN AZ dosya üretirdi.
 */
export function chartExportSearchParams(filter: ChartAccountFilter): Record<string, string> {
  return {
    ...(filter.q ? { q: filter.q } : {}),
    ...(filter.accountType ? { account_type: filter.accountType } : {}),
    ...(filter.isActive !== undefined ? { is_active: String(filter.isActive) } : {}),
  };
}

/** `GET /chart-of-accounts/export.xlsx` — HP arama kutusunu AYNEN taşır. */
export async function downloadChartOfAccountsExport(
  filter: ChartAccountFilter,
): Promise<void> {
  await downloadExport(
    withQuery(CHART_EXPORT_PATH, chartExportSearchParams(filter)),
    CHART_FILENAME,
  );
}

/**
 * Yevmiye defteri süzgeçlerinin sunucu adlarına çevrimi.
 *
 * 🔴 `limit`/`offset`/`enabled` GEÇMEZ (sayfalama süzgeç değildir, `enabled`
 * ise istemci tarafı bir kapıdır). `year`/`month`/`account_id`/`status`
 * `useLedger` ile BİREBİR aynı adlarla gider.
 */
export function journalExportSearchParams(filter: LedgerFilter): Record<string, string> {
  return {
    year: String(filter.year),
    month: String(filter.month),
    ...(filter.accountId ? { account_id: filter.accountId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
  };
}

/** `GET /journal/export.xlsx` — MU defter panelinin süzgeçlerini AYNEN taşır. */
export async function downloadJournalExport(filter: LedgerFilter): Promise<void> {
  await downloadExport(
    withQuery(JOURNAL_EXPORT_PATH, journalExportSearchParams(filter)),
    JOURNAL_FILENAME,
  );
}
