import Link from "next/link";

import { EQUIPMENT_EMPTY_VALUE } from "@/components/equipment/equipment-labels";
import { formatDecimal, formatPercent, formatPeriod } from "@/lib/format";
import type { WorkSummaryRow } from "@/lib/api/hooks/useEquipmentWorkSummary";

import { USAGE_PCT_TILE_LABEL } from "./equipment-detail-labels";
import type { DetailPeriod } from "./detail-period";

export interface WorkHistoryEntry {
  period: DetailPeriod;
  /** `undefined` ⇒ o ayın sorgusu pending · `null` ⇒ yanıt geldi, satır YOK. */
  row: WorkSummaryRow | null | undefined;
  siteLabel: string | null | undefined;
}

export interface EquipmentWorkCardProps {
  /** Cari ayın satırı — `null` ⇒ yanıtta yok (aşağıdaki nota bak). */
  currentRow: WorkSummaryRow | null | undefined;
  history: WorkHistoryEntry[];
}

/**
 * MD:198-231 · ⏱ Çalışma Kaydı Özeti.
 *
 * 🔴 `GET /equipment/work-summary` NEYİN kümesidir — sorgu gövdesinden
 * (`repository.work_summary_rows`): kaynak tablo **`equipment`**tir (kayıt
 * tablosu DEĞİL) ve çalışma kayıtlarına OUTER JOIN yapılır, yani o ay hiç
 * çalışmamış makine de 0 saatle listelenir. Ama `HAVING` elemesi
 * `Equipment.is_active.is_(True) | (kayıt_sayısı > 0)`tır:
 *
 * 👉 **KULLANIMDAN KALDIRILMIŞ ve o ay hiç kaydı olmayan ekipman yanıtta HİÇ
 * BULUNMAZ.** Bu yüzden "satır yok" ile "0 saat" ekranda AYRI basılır; satır
 * yokluğunu 0 diye basmak, ölçülmemiş bir ayı "hiç çalışmadı" diye
 * damgalamak olurdu.
 *
 * Ucun `equipment_id` parametresi YOKTUR (yalnız `year`/`month`/`site_id`) —
 * satır istemcide süzülür; bu bir hesap değil, bir SEÇİMDİR.
 */
export function EquipmentWorkCard({ currentRow, history }: EquipmentWorkCardProps) {
  return (
    <section className="makine-det__card" aria-label="Çalışma Kaydı Özeti">
      <div className="makine-det__card-head">
        <h2 className="makine-det__card-title">⏱ Çalışma Kaydı Özeti</h2>
        <Link href="/makine/calisma" className="makine-det__card-more">
          Tümü →
        </Link>
      </div>

      {/* MD:203-208 */}
      <div className="makine-det__tiles makine-det__tiles--3">
        <Tile
          tone="primary"
          value={currentRow ? formatDecimal(currentRow.hours, 2) : EQUIPMENT_EMPTY_VALUE}
          label="Bu Ay Saat"
        />
        <Tile
          tone="success"
          value={
            currentRow ? formatDecimal(currentRow.breakdown_hours, 2) : EQUIPMENT_EMPTY_VALUE
          }
          label="Arıza Saati"
        />
        {/* 🔴 MOCKUP SAPMASI — MD:207 bu kutuyu `Kullanılabilirlik` diye
            etiketliyor ama sunucu öyle bir büyüklük ÜRETMEZ: `usage_pct`
            `hours / monthly_capacity_hours × 100`tür (KAPASİTE KULLANIMI).
            Depodaki yerleşik ad kullanılır (`equipment-detail-labels.ts`). */}
        <Tile
          value={
            currentRow?.usage_pct ? formatPercent(currentRow.usage_pct) : EQUIPMENT_EMPTY_VALUE
          }
          label={USAGE_PCT_TILE_LABEL}
          testId="makine-det-usage-tile"
        />
      </div>

      {currentRow === null && (
        <p className="makine-det__band" data-testid="makine-det-work-missing">
          Bu ay için çalışma özeti satırı yok — ekipman kullanımdan kaldırılmışsa ve o ay hiç
          kaydı yoksa sunucu onu özet tablosuna HİÇ koymaz.
        </p>
      )}
      {currentRow !== null && currentRow !== undefined && currentRow.usage_pct === null && (
        <p className="makine-det__band" data-testid="makine-det-usage-reason">
          Kullanım oranı hesaplanamadı — bu ekipmanın aylık kapasite saati tanımlı değil.
        </p>
      )}

      {/* MD:210-229 — son üç ay. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {history.map((entry) => {
          const key = `${entry.period.year}-${entry.period.month}`;
          const breakdown = entry.row === null || entry.row === undefined
            ? 0
            : Number(entry.row.breakdown_hours);
          return (
            <div
              key={key}
              className="makine-det__link makine-det__link--muted"
              data-testid={`makine-det-history-${key}`}
            >
              <div className="makine-det__link-body">
                <div className="makine-det__link-title">
                  {formatPeriod(entry.period.year, entry.period.month)}
                </div>
                {/* MD:214 mockup `22 gün · A-Blok` yazıyor. GÜN SAYISI hiçbir
                    uçta YOKTUR (`WorkSummaryRow` saat/arıza/maliyet taşır,
                    gün taşımaz) — UYDURULMAZ, satırdan düşürülür ve rapora
                    yazılır. Şantiye adı `row.site_id`den gelir. */}
                <div className="makine-det__link-note">
                  {entry.row === undefined
                    ? "Yükleniyor…"
                    : entry.row === null
                      ? "Kayıt yok"
                      : [
                          entry.siteLabel === undefined
                            ? "…"
                            : (entry.siteLabel ?? "Depoda (Atanmadı)"),
                          breakdown > 0
                            ? `${formatDecimal(entry.row.breakdown_hours, 2)} sa arıza`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                </div>
              </div>
              <span className="makine-det__link-amount">
                {entry.row ? `${formatDecimal(entry.row.hours, 2)} sa` : EQUIPMENT_EMPTY_VALUE}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tile({
  tone,
  value,
  label,
  testId,
}: {
  tone?: "primary" | "success" | "danger";
  value: string;
  label: string;
  testId?: string;
}) {
  return (
    <div className={`makine-det__tile${tone ? ` makine-det__tile--${tone}` : ""}`}>
      <div className="makine-det__tile-value" data-testid={testId}>
        {value}
      </div>
      <div className="makine-det__tile-label">{label}</div>
    </div>
  );
}
