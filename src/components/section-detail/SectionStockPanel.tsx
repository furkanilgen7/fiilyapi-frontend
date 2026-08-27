import Link from "next/link";

import { CardEmptyState } from "@/components/dashboard/CardEmptyState";

import "./section-detail.css";

/**
 * F-BLMSEK T3 · Bölüm Detay › "Malzeme" sekmesinin GÖVDESİ.
 *
 * 🔴 BU SEKME BİLİNÇLİ OLARAK PENDİNG KALIR — diğer dört sekmenin aksine
 * burada AÇILACAK bir bölüm bağı YOK. Ölçüldü: `backend/app/modules/
 * inventory/` içinde `section_id` SIFIR kolon isabeti; tek eşleşme bir YORUM
 * satırı (`schemas.py:396`, `purchase_requests.section_id`ye değinir). Stok
 * hareketi KAYDININ KENDİSİ bölüm alanı taşımıyor — `/stok` modülü CANLI ve
 * yazılı, eksik olan alan/uçtur (`work_category` emsali), MODÜL değil.
 *
 * 🔑 Kullanıcı şikâyeti üç sekmenin AYNI GÖRÜNMESİYDİ (hepsi jenerik
 * `${label} — bu bölümde henüz görüntülenemiyor` basıyordu). T1/T2 diğer iki
 * sekmeyi canlıya aldı; bu panel SPESİFİK bir başlık + kullanıcıyı GERÇEK
 * veriye yönlendiren bir bağlantı ekleyerek Malzeme'yi de ayırt edilebilir
 * kılar. `CardEmptyState` + `pendingModule="section_stock"` KORUNUR — bu
 * gerçekten pending olan TEK sekmedir, yalan söylemez.
 */
export interface SectionStockPanelProps {
  /** Başlıkta basılır — jenerik doldur-boşluk yerine bölümün kendi kimliği. */
  sectionName: string;
  /** `sideLinkHref(SIDE_LINKS.stock)` — TEK tanım; `carriesSection: false` kararı burada da geçerlidir, `?section=` EKLENMEZ. */
  stockHref: string;
}

export function SectionStockPanel({ sectionName, stockHref }: SectionStockPanelProps) {
  return (
    <section
      className="section-stock"
      data-testid="section-stock"
      aria-labelledby="section-stock-title"
    >
      <div className="section-stock__head">
        <h2 className="section-stock__title" id="section-stock-title">
          {sectionName} · Stok Hareketleri
        </h2>
        <Link className="section-stock__link" href={stockHref}>
          Şantiye stok ekranı →
        </Link>
      </div>
      <div className="section-stock__body">
        <CardEmptyState
          title={`${sectionName} için ayrı stok kaydı basılmıyor`}
          pendingModule="section_stock"
        />
        <p className="section-stock__hint">
          Malzeme hareketleri bölüme değil şantiye deposuna kaydedilir; şantiye
          geneli olarak yukarıdaki &ldquo;Şantiye stok ekranı →&rdquo;
          bağlantısında görüntülenir.
        </p>
      </div>
    </section>
  );
}
