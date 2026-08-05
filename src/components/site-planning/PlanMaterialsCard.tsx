import { pendingModuleLabel } from "@/lib/pending-modules";

/**
 * P185-201 · "📦 Malzeme Planı — Bu Hafta" kartı — **PENDING**.
 *
 * Stok/satınalma modülü bu repoda YOK: ne haftalık malzeme ihtiyacını veren
 * bir uç, ne de "Acil Sipariş →" bağlantısının hedefi (Satınalma & Teklif
 * ekranı) var. Üst kural gereği kart SİLİNMEZ — başlığıyla, yerinde,
 * devre dışı ve görünür gerekçeyle basılır (`DiaryPhotosCard` emsali).
 *
 * UYDURMA VERİ YOK: mockup'ın üç sahte malzeme satırı (Nervürlü Demir Ø12 /
 * C25-30 Beton / Kalıp Yağı) ve sipariş bağlantıları BASILMAZ — gerçek stok
 * gibi görünen sayılar sahada yanlış karar verdirirdi.
 *
 * SIZINTI YOK: bileşen prop ALMAZ, state TUTMAZ, ağa ÇIKMAZ.
 */
export function PlanMaterialsCard() {
  return (
    <section className="plan-card" aria-labelledby="plan-materials-title">
      {/* P186 */}
      <h2 className="plan-card__title" id="plan-materials-title">
        📦 Malzeme Planı — Bu Hafta
      </h2>

      <p className="plan__notice">
        Haftalık malzeme ihtiyacı henüz açılmadı — {pendingModuleLabel("stock")}.
      </p>

      {/* P188-200: üç malzeme satırının yerini tutan devre dışı yüzey. */}
      <div className="plan-materials__placeholder" aria-hidden="true">
        <span className="plan-materials__placeholder-row" />
        <span className="plan-materials__placeholder-row" />
        <span className="plan-materials__placeholder-row" />
      </div>
    </section>
  );
}
