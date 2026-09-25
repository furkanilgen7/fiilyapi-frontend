/**
 * ═══ GÜNLÜK KAYIT DETAYININ UZANTI YUVALARI (DET-1.3 · §2.7) ═══
 *
 * Emsal: `site-diary/diary-extension.ts` (günlük ekranı). Salt okunur detay
 * sayfası ÇEKİRDEKTİR ve planlama (`earned-value`) kodunu IMPORT ETMEZ.
 * Planlamanın detaya kattığı her şey — miktar tablosundaki "Bugün kaz. a-s" ·
 * "PF" kolonları, bölüm ara toplamı / günün toplamı hücreleri, başlık KPI'ları
 * ("Bugün kazanılmış" · "Bugün PF"), Saat Dağıtımı özeti ve "Gün n · Hn" eki —
 * YALNIZ bu dosyadaki tiplerle gelir:
 *
 *   çekirdek (`SiteDiaryDetailView`) ──onExtensionContext(ctx)──▶ dış modül
 *   çekirdek ◀─────────── extension: DiaryDetailExtension ─────── dış modül
 *
 * Dış modül kurulu değilse (ya da şantiyede planlama yoksa) `extension`
 * verilmez ve çekirdek kartları TAM basar (mockup hâl h). Her alan opsiyoneldir.
 *
 * Bu dosya YALNIZ tip taşır (çalışma zamanı kodu yok).
 */
import type { ReactNode } from "react";

/** Miktar tablosunun bir satırı (kaydın `lines[]` öğesi). */
export interface DiaryDetailLineRef {
  lineId: string;
  /** Sözleşme pozu kaldırılmış (öksüz) satırda `null`. */
  boqItemId: string | null;
  /** Bölümsüz satırda `null`. */
  sectionId: string | null;
}

/** Çekirdeğin dış modüle bildirdiği bağlam; değişince yeniden bildirilir. */
export interface DiaryDetailContext {
  /** Kanonik şantiye UUID'si (kaydın `site_id`i). */
  siteId: string;
  /** Kaydın günü, `YYYY-MM-DD`. */
  day: string;
  entryId: string;
  /** Açık bölümün kanonik kimliği; bölüm okunamadıysa `null` (Kural A kurulmaz). */
  currentSectionId: string | null;
  /** Açık bölümün adı (ör. Saat Dağıtımı özetindeki "Bu bölüm · Kat 6–10"); yoksa `null`. */
  currentSectionName: string | null;
  /**
   * "Günlük kayıtta aç" hedefi — YALNIZ düzenleyebilene (S8: `site_diary`
   * yazma + kilitsiz gün) verilir; yoksa `undefined` ve dış modül de bağlantı
   * BASMAZ ("Tam dağılım → Günlük kayıtta aç").
   */
  openHref: string | undefined;
}

/** Tablo altı toplam satırlarının ek hücreleri. */
export interface DiaryDetailTotalCells {
  /** Satırın ad hücresine ek (ör. "harcanan 243,0 a-s"); yoksa `null`. */
  note: ReactNode | null;
  /** `headers` ile AYNI uzunlukta. */
  cells: readonly ReactNode[];
}

/** Miktar tablosuna dış modülün eklediği kolonlar. */
export interface DiaryDetailLineColumns {
  /** `width` px — tablo `colgroup`u ve yatay kaydırma alt sınırı için. */
  headers: readonly { key: string; label: ReactNode; width: number }[];
  /** `headers` ile AYNI uzunlukta hücre dizisi. */
  renderCells: (line: DiaryDetailLineRef) => readonly ReactNode[];
  /** Satırın hemen altına tam genişlik alt satır (ör. oransız kalem); yoksa `null`. */
  renderSubRow?: (line: DiaryDetailLineRef) => ReactNode | null;
  /** Kural A — "Bu bölüm" ARA TOPLAM satırının ek hücreleri. */
  renderSectionSubtotal: (sectionId: string) => DiaryDetailTotalCells;
  /** Günün toplamı (tüm bölümler) satırı; yoksa satır basılmaz. */
  dayTotal: { label: ReactNode; cells: readonly ReactNode[] } | null;
  /** Kart alt başlığının SONUNA ek (ör. "kazanılmış = bugün miktar × birim oran (Rev 1)"). */
  captionSuffix?: string;
  /** Kalem kod satırına ek etiket (İ:225 "Kendi" / "Taşeron"); yoksa `null`. */
  renderLineTag?: (line: DiaryDetailLineRef) => string | null;
}

/** Başlık kartının KPI kutusu (D:69-95 deseni). */
export interface DiaryDetailKpi {
  key: string;
  label: string;
  value: ReactNode;
  note: ReactNode;
}

/** Dış modülün detay sayfasına verdiği yuvalar. Hepsi opsiyoneldir. */
export interface DiaryDetailExtension {
  /** Başlık meta satırının sonuna ek (ör. "Gün 142 · H21"). */
  headerSuffix?: ReactNode;
  lineColumns?: DiaryDetailLineColumns | null;
  /** Miktar kartının başlığı altında şerit (hâl i: "Planlama sütunları gizli"). */
  linesNotice?: ReactNode;
  /** KPI ızgarasında "Miktar satırı"ndan SONRA gelen kutular. */
  kpis?: readonly DiaryDetailKpi[];
  /** Miktar kartının altında, İşçi Dağılımı'nın solunda blok (Saat Dağıtımı özeti). */
  fullWidthBlock?: ReactNode;
}

export interface DiaryDetailExtensionProps {
  extension?: DiaryDetailExtension;
  onExtensionContext?: (ctx: DiaryDetailContext) => void;
}
