import { pendingModuleLabel } from "@/lib/pending-modules";

/**
 * GK274-318 · "📷 Şantiye Fotoğrafları" kartı — **PENDING**.
 *
 * Belge/fotoğraf çekirdeği henüz karara bağlanmadı; günlük kayıt şemasında
 * (`SiteDiaryEntryCreate`/`Update`) fotoğraf alanı YOKTUR ve yükleme ucu
 * bulunmuyor. Üst kural gereği kart SİLİNMEZ: mockup'taki başlık, kısıt
 * metni (GK278), 4'lü ızgara ve sürükle-bırak alanı (GK313-318) yerinde
 * basılır — yalnız kontroller DEVRE DIŞIdır ve gerekçe görünür.
 *
 * SIZINTI YOK: bu bileşen prop ALMAZ, state TUTMAZ ve form durumuna
 * (`DiaryFormState`) hiçbir alan eklemez — kaydedilen gövdeye giremez.
 */
export function DiaryPhotosCard() {
  return (
    <section className="diary-card" aria-labelledby="diary-photos-title">
      <div className="diary-card__head">
        <h2 className="diary-card__title" id="diary-photos-title">
          📷 Şantiye Fotoğrafları
        </h2>
        {/* GK278 */}
        <span className="diary-card__meta">Max 20 fotoğraf · JPG, PNG · 10MB/adet</span>
      </div>

      <p className="diary__notice">
        Fotoğraf yükleme henüz açılmadı — {pendingModuleLabel("documents")}.
      </p>

      {/* GK282-310: 4'lü ızgara. Sahte fotoğraf basılmaz; yalnız yükleme
          hücresi (GK305-309) devre dışı gösterilir. */}
      <div className="diary-photos__grid" aria-hidden="true">
        <div className="diary-photos__tile diary-photos__tile--disabled">
          <span className="diary-photos__plus">+</span>
          <span className="diary-photos__tile-label">Fotoğraf Ekle</span>
        </div>
      </div>

      {/* GK313-318: büyük sürükle-bırak alanı — devre dışı. */}
      <div className="diary-photos__drop diary-photos__drop--disabled">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path
            d="M14 4v14M7 11l7-7 7 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4 22h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="diary-photos__drop-title">Fotoğrafları buraya sürükle veya tıkla</span>
        <span className="diary-photos__drop-hint">
          JPG, PNG, HEIC · Maks 10 MB/adet · Çoklu seçim yapılabilir
        </span>
      </div>
    </section>
  );
}
