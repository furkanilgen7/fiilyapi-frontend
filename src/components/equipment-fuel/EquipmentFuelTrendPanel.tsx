import { EMPTY_VALUE } from "./consumption";
import { TREND_DISABLED_REASON } from "./fuel-labels";
import "./equipment-fuel.css";

/**
 * M4 72-91 · "Aylık Yakıt Trendi" paneli.
 *
 * Rotası/ucu olmayan mockup öğesi SİLİNMEZ (F-TH kuralı): panel yapısı
 * (başlık + grafik alanı + iki özet kutusu) korunur, içerik devre-dışı +
 * görünür Türkçe gerekçeyle basılır — altı aylık geçmiş seriyi veren bir uç
 * `GET /equipment/fuel-summary` yalnız tek ay/yıl aldığı için YOK.
 */
export function EquipmentFuelTrendPanel() {
  return (
    <section className="makine-yakit-panel" data-testid="makine-yakit-trend">
      {/* 74 */}
      <h2 className="makine-yakit-panel__title">Aylık Yakıt Trendi (Lt)</h2>

      <div
        className="makine-yakit-trend__placeholder"
        role="img"
        aria-label={TREND_DISABLED_REASON}
        title={TREND_DISABLED_REASON}
        data-testid="makine-yakit-trend-disabled"
      >
        {EMPTY_VALUE}
      </div>
      <p className="makine-yakit-panel__reason">{TREND_DISABLED_REASON}</p>

      {/* 87-90 */}
      <div className="makine-yakit-trend__summary">
        <div className="makine-yakit-trend__summary-box">
          <div className="makine-yakit-trend__summary-label">6 Aylık Toplam</div>
          <div className="makine-yakit-trend__summary-value">{EMPTY_VALUE}</div>
        </div>
        <div className="makine-yakit-trend__summary-box makine-yakit-trend__summary-box--danger">
          <div className="makine-yakit-trend__summary-label">6 Aylık Maliyet</div>
          <div className="makine-yakit-trend__summary-value">{EMPTY_VALUE}</div>
        </div>
      </div>
    </section>
  );
}
