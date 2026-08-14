import { Button } from "@/components/ui/button/Button";
import { formatDayMonthShort, formatDecimal } from "@/lib/format";
import type { WorkLogResponse } from "@/lib/api/hooks/useEquipmentWorkLogs";

import { RECENT_ALL_DISABLED_REASON } from "./work-labels";
import "./equipment-work.css";

export interface EquipmentWorkRecentListProps {
  logs: WorkLogResponse[] | undefined;
  isLoading: boolean;
  /** Kayıt yalnız UUID taşır; adlar AYRI kaynaklardan çözülür. */
  resolveEquipmentName: (equipmentId: string) => string | undefined;
  resolveSiteLabel: (siteId: string | null) => string | null | undefined;
  resolveOperatorName: (operatorId: string | null) => string | null | undefined;
}

/** "06:00:00" ⇒ "06:00" — saniye mockup'ta yok (261). */
function clockText(time: string): string {
  return time.slice(0, 5);
}

/**
 * M3 247-298 · "Son Kayıtlar".
 *
 * ⚠️ Bu blok BİLEREK kısadır (mockup dört kayıt çizer + "Tümünü Gör"): bir
 * sayfalama yüzeyi DEĞİLDİR ve hiçbir toplam bu listeden türetilmez — TB3
 * kırpma korkuluğu bu yüzden burada UYGULANMAZ (korkuluk, eksik listeden
 * türetilen PARA/TOPLAM içindir; bu ekranın toplamları sunucudan gelir).
 */
export function EquipmentWorkRecentList({
  logs,
  isLoading,
  resolveEquipmentName,
  resolveSiteLabel,
  resolveOperatorName,
}: EquipmentWorkRecentListProps) {
  return (
    <section className="makine-cal-panel" data-testid="makine-cal-recent">
      {/* 248-251 */}
      <div className="makine-cal-panel__head">
        <h2 className="makine-cal-panel__title makine-cal-panel__title--plain">Son Kayıtlar</h2>
        {/* Rotası olmayan mockup öğesi SİLİNMEZ, devre-dışı basılır (F-TH kuralı). */}
        <Button
          variant="ghost"
          size="sm"
          disabled
          title={RECENT_ALL_DISABLED_REASON}
          data-testid="makine-cal-recent-all"
        >
          Tümünü Gör
        </Button>
      </div>
      <p className="makine-cal-panel__reason">{RECENT_ALL_DISABLED_REASON}</p>

      {isLoading && <p className="makine-cal-panel__note">Yükleniyor…</p>}
      {!isLoading && logs?.length === 0 && (
        <p className="makine-cal-panel__note" data-testid="makine-cal-recent-empty">
          Bu dönemde kayıt yok.
        </p>
      )}

      {logs !== undefined && logs.length > 0 && (
        <ul className="makine-cal-recent">
          {logs.map((log) => {
            const isBreakdown = log.record_type === "breakdown";
            const equipmentName = resolveEquipmentName(log.equipment_id);
            const siteLabel = resolveSiteLabel(log.site_id);
            const operatorName = resolveOperatorName(log.operator_id);
            const hours = `${formatDecimal(log.hours, 2)} Saat`;

            return (
              <li
                key={log.id}
                className={
                  "makine-cal-recent__item" +
                  (isBreakdown ? " makine-cal-recent__item--danger" : "")
                }
                data-testid="makine-cal-recent-item"
              >
                {/* 254-257 */}
                <div className="makine-cal-recent__head">
                  <span className="makine-cal-recent__name">
                    {equipmentName ?? "Yükleniyor…"}
                  </span>
                  <span className="makine-cal-recent__date">
                    {formatDayMonthShort(log.work_date)}
                  </span>
                </div>
                {/* 258 */}
                <div className="makine-cal-recent__meta">
                  {siteLabel === undefined ? "Yükleniyor…" : (siteLabel ?? "Şantiye atanmadı")}
                  {operatorName !== null && (
                    <>
                      {" · Operatör: "}
                      {operatorName === undefined ? "Yükleniyor…" : operatorName}
                    </>
                  )}
                </div>
                {/* 259-262 */}
                <div className="makine-cal-recent__foot">
                  <span
                    className={
                      "makine-cal-recent__badge" +
                      (isBreakdown ? " makine-cal-recent__badge--danger" : "")
                    }
                  >
                    {isBreakdown ? `Arıza — ${hours}` : hours}
                  </span>
                  <span className="makine-cal-recent__time">
                    {log.start_time && log.end_time
                      ? `${clockText(log.start_time)}–${clockText(log.end_time)}`
                      : (log.note ?? "")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
