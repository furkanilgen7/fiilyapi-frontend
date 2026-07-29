/**
 * Proje Belgeleri — P1.1b yer tutucusu (spec §8, §7.11). Mockup satır 162–209
 * düzeniyle birebir; ancak gerçek yükleme YOK: `<input type=file>` render
 * edilmez, kutular `aria-disabled`, rozetler "Yakında". `documents`
 * pending_module etiketi `pendingModuleLabel` içinde tanımlı.
 */

interface DocItem {
  emoji: string;
  /** İkon zemini — token (mockup renkleri). */
  iconBg: string;
  title: string;
  subtitle: string;
}

const DOCS: readonly DocItem[] = [
  {
    emoji: "📄",
    iconBg: "var(--color-danger-soft)",
    title: "İşveren Sözleşmesi",
    subtitle: "İmzalı PDF nüsha",
  },
  {
    emoji: "📊",
    iconBg: "var(--color-success-soft)",
    title: "Poz Listesi (BOQ)",
    subtitle: "Excel · Otomatik içe aktarılır",
  },
  {
    emoji: "🏛",
    iconBg: "var(--color-warning-soft)",
    title: "Yapı Ruhsatı",
    subtitle: "Belediye onaylı",
  },
  {
    emoji: "📐",
    iconBg: "var(--color-accent-purple-soft)",
    title: "Mimari & Statik Proje",
    subtitle: "DWG veya PDF",
  },
  {
    emoji: "🔬",
    iconBg: "var(--color-primary-soft)",
    title: "Zemin Etüt Raporu",
    subtitle: "Jeoteknik rapor",
  },
  {
    emoji: "🛡",
    iconBg: "var(--color-success-tint)",
    title: "Teminat Mektubu",
    subtitle: "Banka teminatı",
  },
];

const SOON_TITLE = "Belge yükleme yakında (P1.1b)";

export function DocumentsPlaceholderCard() {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">
        <span>📎 Proje Belgeleri</span>
        <span className="pf-card__note">
          Belge yükleme yakında eklenecek — proje oluşturduktan sonra belgeleri
          yükleyebileceksiniz.
        </span>
      </h2>

      <div className="pf-docs__grid">
        {DOCS.map((doc) => (
          <div
            key={doc.title}
            className="pf-doc"
            aria-disabled="true"
            title={SOON_TITLE}
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

      <div className="pf-doc pf-doc--drop" aria-disabled="true" title={SOON_TITLE}>
        <span className="pf-doc__text pf-doc__text--center">
          <span className="pf-doc__title">
            Diğer proje belgelerini yükleyebileceksiniz
          </span>
          <span className="pf-doc__sub">
            İzin belgeleri, sigorta poliçesi, protokoller vb.
          </span>
        </span>
        <span className="pf-doc__badge">Yakında</span>
      </div>
    </section>
  );
}
