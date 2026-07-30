/**
 * Belge yer tutucusu kartı — iki formun da kullandığı yüzey.
 *
 * Düzen/metin/ikon mockup'la birebir, ama gerçek yükleme YOK: `<input type=file>`
 * render edilmez, sürükleme işleyicisi yazılmaz, kutular `aria-disabled`,
 * rozetler "Yakında". İçerik (başlık, not, kalemler, sürükle-bırak metinleri)
 * çağıran formun sabitinden gelir; bileşende gömülü kalmaz.
 */

export interface DocumentPlaceholderItem {
  emoji: string;
  /** İkon zemini — token (mockup renkleri). Çıplak hex yazılmaz. */
  iconBg: string;
  title: string;
  subtitle: string;
}

interface DocumentsPlaceholderCardProps {
  title: string;
  /** Başlık yanındaki "yakında" notu. */
  note: string;
  items: readonly DocumentPlaceholderItem[];
  dropTitle: string;
  dropSubtitle: string;
  /** Kutuların `title` özniteliği — neden kullanılamadığını söyler. */
  soonTitle: string;
  /** Izgara sütun sayısı: proje formu 2, şantiye formu 3 (mockup satır 179). */
  columns?: 2 | 3;
}

export function DocumentsPlaceholderCard({
  title,
  note,
  items,
  dropTitle,
  dropSubtitle,
  soonTitle,
  columns = 2,
}: DocumentsPlaceholderCardProps) {
  const gridClassName =
    columns === 3 ? "pf-docs__grid pf-docs__grid--3" : "pf-docs__grid";

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">
        <span>{title}</span>
        <span className="pf-card__note">{note}</span>
      </h2>

      <div className={gridClassName}>
        {items.map((doc) => (
          <div
            key={doc.title}
            className="pf-doc"
            aria-disabled="true"
            title={soonTitle}
          >
            <span
              className="pf-doc__icon"
              style={{ backgroundColor: doc.iconBg }}
              aria-hidden="true"
            >
              {doc.emoji}
            </span>
            <span className="pf-doc__text">
              <span className="pf-doc__title">{doc.title}</span>
              <span className="pf-doc__sub">{doc.subtitle}</span>
            </span>
            <span className="pf-doc__badge">Yakında</span>
          </div>
        ))}
      </div>

      <div className="pf-doc pf-doc--drop" aria-disabled="true" title={soonTitle}>
        <span className="pf-doc__text pf-doc__text--center">
          <span className="pf-doc__title">{dropTitle}</span>
          <span className="pf-doc__sub">{dropSubtitle}</span>
        </span>
        <span className="pf-doc__badge">Yakında</span>
      </div>
    </section>
  );
}
