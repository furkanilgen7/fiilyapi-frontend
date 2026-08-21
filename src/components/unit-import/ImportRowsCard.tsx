import { Badge, Button, Checkbox } from "@/components/ui";
import { CheckIcon, WarningTriangleIcon, XIcon, inlineSymbolProps } from "@/components/ui/icons";
import { formatAmount } from "@/lib/format";

import {
  IMPORT_ERROR_REPORT_LABEL,
  IMPORT_ERROR_REPORT_PENDING_REASON,
  IMPORT_FILTER_ALL_LABEL,
  IMPORT_FILTER_ERROR_LABEL,
  IMPORT_FILTER_WARNING_LABEL,
  IMPORT_ROWS_CARD_TITLE,
  IMPORT_ROWS_EMPTY_NOTICE,
  IMPORT_ROW_COLUMN_LABELS,
  IMPORT_ROW_READY_LABEL,
  IMPORT_STATUS_LABELS,
  importIncludeWarningsLabel,
} from "./constants";
import {
  filterImportRows,
  importFilterCounts,
  type ImportRowFilter,
  type UnitImportRowReport,
  type UnitImportRowStatus,
  type UnitImportValidation,
} from "./report";

interface ImportRowsCardProps {
  validation: UnitImportValidation;
  filter: ImportRowFilter;
  includeWarnings: boolean;
  onChangeFilter: (filter: ImportRowFilter) => void;
  onToggleIncludeWarnings: (next: boolean) => void;
}

/** Satır başına TEK durum vardır (`UnitImportRowStatus`); hatalı satır ayrıca "uyarılı" OLMAZ. */
const STATUS_ICON: Readonly<Record<UnitImportRowStatus, typeof CheckIcon>> = {
  ok: CheckIcon,
  warning: WarningTriangleIcon,
  error: XIcon,
};

/** Boş hücre işareti (EI 158 `—`). */
const EMPTY_CELL = "—";

/**
 * "Satır Detayları" kartı (EI 105-197).
 *
 * 🔴 `messages` BİR LİSTEDİR ve BİRLEŞTİRİLMEZ. EI 161 tek satırda iki mesaj
 * gösteriyor ("Oda Tipi boş · Brüt m² sıfır olamaz"); `join(" · ")` yapmak o
 * iki mesajı kalıcı olarak tek metne dönüştürür ve satır başına mesaj sayısını
 * ölçme/biçimlendirme imkânını yok ederdi. Her mesaj kendi `<li>`si olarak
 * basılır — mockup'ın orta nokta ayracı liste stiliyle üretilir.
 *
 * 🔴 EI 131/142/154/166/177 durum simgeleri `✓ ✗ ⚠` glif bekçisinin YASAK
 * sınıfındadır → `CheckIcon`/`XIcon`/`WarningTriangleIcon`. Yanlarına GÖRSEL
 * olarak gizli bir Türkçe etiket konur: durum yalnız renkten okunmaz.
 *
 * 🔴 EI 195 "Hata Raporunu İndir" — SUNUCUDA KARŞILIĞI YOKTUR (ölçüldü:
 * `units/router.py` sekiz uç açar, hiçbiri hata raporu üretmez). Kanon gereği
 * düğme SİLİNMEZ, devre dışı basılır ve gerekçe `title`da saklanmaz, EKRANDA
 * durur (F-UNIT1 BE 109 emsali).
 *
 * ⚠️ EI 186 "… 19 satır daha" satırı BASILMAZ ve bu bir eksiklik DEĞİLDİR:
 * statik mockup'ın çizim kısaltmasıdır. Sunucu `rows` dizisini TAM gönderir
 * (`batch.py`: `rows=[plan.report for plan in plans]`, kırpma YOK) ve EI 115
 * kutusu zaten kendi içinde 400px kaydırılır. 24 satır DOM'dayken "19 satır
 * daha" yazmak kullanıcıya YANLIŞ bilgi verirdi (TU 166 ile aynı karar).
 *
 * ⚠️ Süzgeç rozetlerinin sayıları ÖZETTEN gelir, satır listesinden değil
 * (`importFilterCounts`, T1): iki kaynak ayrışırsa ekran kendi tablosuyla
 * çelişen bir sayı basardı.
 */
export function ImportRowsCard({
  validation,
  filter,
  includeWarnings,
  onChangeFilter,
  onToggleIncludeWarnings,
}: ImportRowsCardProps) {
  const counts = importFilterCounts(validation.summary);
  const rows = filterImportRows(validation.rows, filter);

  const filters: readonly { key: ImportRowFilter; label: string; count: number }[] = [
    { key: "all", label: IMPORT_FILTER_ALL_LABEL, count: counts.all }, // 110
    { key: "error", label: IMPORT_FILTER_ERROR_LABEL, count: counts.error }, // 111
    { key: "warning", label: IMPORT_FILTER_WARNING_LABEL, count: counts.warning }, // 112
  ];

  return (
    <section className="pf-card ei-flush-card" data-testid="excel-form-satirlar-kart">
      {/* 106-115 */}
      <div className="ei-rows__head">
        <h2 className="ei-rows__title">
          <Badge variant="primary" shape="count" className="ei-step">
            3
          </Badge>
          {IMPORT_ROWS_CARD_TITLE}
        </h2>
        <div className="ei-rows__filters" role="group" aria-label="Satır süzgeci">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`ei-filter ei-filter--${item.key}${
                filter === item.key ? " ei-filter--on" : ""
              }`}
              aria-pressed={filter === item.key}
              data-testid={`excel-form-suzgec-${item.key}`}
              onClick={() => onChangeFilter(item.key)}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </div>

      {/* 115-189 — tablo kendi içinde kaydırılır */}
      <div className="ei-rows__scroll">
        <table className="ei-rows-table" data-testid="excel-form-satir-tablosu">
          <thead>
            <tr>
              {IMPORT_ROW_COLUMN_LABELS.map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={IMPORT_ROW_COLUMN_LABELS.length} className="ei-rows-table__empty">
                  {IMPORT_ROWS_EMPTY_NOTICE}
                </td>
              </tr>
            ) : (
              rows.map((row) => <ImportRow key={row.row} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      {/* 191-196 — alt şerit */}
      <div className="ei-rows__foot">
        <Checkbox
          // 192 — mockup'ta `checked`; şema varsayılanı da `true`.
          checked={includeWarnings}
          data-testid="excel-form-uyarili-dahil"
          label={importIncludeWarningsLabel(validation.summary.warning)}
          onChange={(event) => onToggleIncludeWarnings(event.target.checked)}
        />
        <div className="ei-rows__foot-right">
          {/* 195 — sunucuda karşılığı YOK: silinmez, devre dışı basılır */}
          <Button
            variant="secondary"
            size="sm"
            className="ei-error-report"
            disabled
            data-testid="excel-form-hata-raporu"
          >
            {IMPORT_ERROR_REPORT_LABEL}
          </Button>
          <p className="ei-pending-reason" data-testid="excel-form-hata-raporu-gerekce">
            {IMPORT_ERROR_REPORT_PENDING_REASON}
          </p>
        </div>
      </div>
    </section>
  );
}

/** EI 129-185 — tek rapor satırı. Sütunlar `UnitImportRowReport` ile BİREBİR. */
function ImportRow({ row }: { row: UnitImportRowReport }) {
  const StatusIcon = STATUS_ICON[row.status];

  return (
    <tr className={`ei-rows-table__row ei-rows-table__row--${row.status}`} data-testid="excel-form-satir">
      <td className="ei-rows-table__no">{row.row}</td>
      <td className="ei-rows-table__center">
        <span className={`ei-status ei-status--${row.status}`}>
          <StatusIcon {...inlineSymbolProps} />
          <span className="ei-status__label">{IMPORT_STATUS_LABELS[row.status]}</span>
        </span>
      </td>
      <td className="ei-rows-table__unit">{row.unit_no ?? EMPTY_CELL}</td>
      <td className="ei-rows-table__center">{row.block_name ?? EMPTY_CELL}</td>
      <td className="ei-rows-table__center">{row.floor ?? EMPTY_CELL}</td>
      <td className="ei-rows-table__center">{row.layout ?? EMPTY_CELL}</td>
      <td className="ei-rows-table__right ei-rows-table__num">
        {row.gross_area_m2 === null ? EMPTY_CELL : formatAmount(row.gross_area_m2)}
      </td>
      <td className="ei-rows-table__right ei-rows-table__price">
        {row.list_price === null ? EMPTY_CELL : formatAmount(row.list_price)}
      </td>
      <td className="ei-rows-table__messages">
        {row.messages.length === 0 ? (
          <span className="ei-message ei-message--ready">{IMPORT_ROW_READY_LABEL}</span>
        ) : (
          // 🔴 AYRI ELEMANLAR — tek metne birleştirilmez (EI 161 iki mesaj).
          <ul className="ei-message-list">
            {row.messages.map((message) => (
              <li key={message} className="ei-message" data-testid="excel-form-satir-mesaj">
                {message}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}
