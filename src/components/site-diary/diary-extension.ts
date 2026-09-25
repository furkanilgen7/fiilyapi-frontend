/**
 * ═══ ÇEKİRDEK GÜNLÜK EKRANININ UZANTI YUVALARI (PLN-F2 · §2.7) ═══
 *
 * Çekirdek (günlük) planlama kodunu IMPORT ETMEZ. Planlamanın günlük ekranına
 * iki kaçınılmaz teması (günün saat dağıtımı bloğu + "Gönder" ön koşulu) ve
 * miktar tablosundaki ek kolonlar YALNIZ bu dosyadaki tiplerle kurulur:
 *
 *   çekirdek (`DiaryEntryScreen`) ──onExtensionContext(ctx)──▶ dış modül
 *   çekirdek ◀──────────────── extension: DiaryExtension ─────── dış modül
 *
 * Dış modül (planlama adaptörü) çekirdek ekranı SARAR: bağlamı alır, kendi
 * hook'larıyla yuvaları doldurur, ekrana geri verir. Modül kurulu değilse
 * `extension` verilmez ve çekirdek bugünkü gibi çalışır — her alan opsiyoneldir.
 *
 * Bu dosya YALNIZ tip taşır (çalışma zamanı kodu yok); sözleşmeyi değiştirmek
 * iki tarafı birden etkiler.
 */
import type { ReactNode } from "react";

/** Miktar tablosunun bir satırı — kalem × bölüm (G1: Bölümsüz `sectionId: null`). */
export interface DiaryLineRef {
  /** Satırın tekil anahtarı (`siteDiaryLineKey(boqItemId, sectionId)`). */
  key: string;
  boqItemId: string;
  sectionId: string | null;
  /**
   * Formdaki GÜNCEL (kaydedilmemiş olabilir) bugünkü miktar; boşsa `null`.
   * G8: dış modül anında önizleme yapabilir, kayıtta backend esastır.
   */
  quantityToday: string | null;
}

/** Çekirdeğin dış modüle bildirdiği bağlam. Değiştikçe yeniden bildirilir. */
export interface DiaryExtensionContext {
  /** Kanonik şantiye UUID'si (slug değil); şantiye henüz çözülmediyse `null`. */
  siteId: string | null;
  /** Seçili gün, `YYYY-MM-DD`. */
  day: string | null;
  /** Günün kaydı varsa kimliği. */
  entryId: string | null;
  entryStatus: "draft" | "submitted" | null;
  lines: readonly DiaryLineRef[];
}

/** Miktar tablosuna dış modülün eklediği kolonlar (ör. "Bugün kaz. a-s", "PF"). */
export interface DiaryLineColumns {
  headers: readonly { key: string; label: ReactNode; align?: "left" | "right" }[];
  /** `headers` ile AYNI uzunlukta hücre dizisi döner. */
  renderCells: (line: DiaryLineRef) => readonly ReactNode[];
  /** Tablo altına ek satır/içerik (ör. "Bugün toplam kazanılmış · harcanan · PF"). */
  footer?: ReactNode;
  /**
   * Kalem BAŞLIK satırının ek hücreleri (G2 — ör. kalem toplamı kazanılmış, PF).
   * Verilirse `headers` ile AYNI uzunlukta; verilmezse başlık satırında boş hücre.
   */
  renderItemCells?: (boqItemId: string) => readonly ReactNode[];
  /** Kart alt başlığına ek (İ:213 — ör. "kazanılmış = bugün miktar × birim oran (Rev 1)"). */
  caption?: ReactNode;
  /**
   * Satırın HEMEN ALTINA tam genişlik alt satır (İ:241-246 — ör. "✕ Bu kaleme
   * oran atanmamış …"). `null` dönerse alt satır basılmaz. (PLN-F2.3.1 · S2)
   */
  renderSubRow?: (line: DiaryLineRef) => ReactNode | null;
}

/**
 * Kalem düzeyi planlama bilgisi (PLN-F2.2 bulgusu). Çekirdek bunları BİLEMEZ —
 * dolaylılık ve kendi/taşeron planlama verisidir; dış modül verir.
 */
export interface DiaryItemMeta {
  /**
   * G9: dolaylı kalemler. Çekirdek bu kalemlerde "+ Bölüm" göstermez ve
   * Bölümsüz satırı "Tüm şantiye" etiketiyle basar (F0-6).
   */
  indirectItemIds?: ReadonlySet<string>;
  /** Kalem adının altındaki kod satırına ek (İ:225 — ör. "Kendi" / "Taşeron"). */
  renderItemTag?: (boqItemId: string) => ReactNode;
}

/** Dış modülün çekirdek ekrana verdiği yuvalar. Hepsi opsiyoneldir. */
export interface DiaryExtension {
  /** Başlık alt satırının sonuna ek (ör. "Gün 142 · H21"). */
  headerSuffix?: ReactNode;
  /**
   * Günün kilidi (rapor onayı). `isLocked` ise çekirdek BÜTÜN alanları salt
   * okunur yapar ve `banner`ı durum satırında basar.
   */
  lock?: { isLocked: boolean; banner: ReactNode } | null;
  /**
   * "Gönder" ön koşulu. `canSubmit === false` ise çekirdek Gönder düğmesini
   * pasif yapar ve gerekçeleri (`reasons`) düğmenin `title`ı ile DEĞİL ekranda
   * gösterir. Backend yine de 422 `reasons[]` ile reddedebilir (tek kaynak).
   */
  submitGate?: {
    canSubmit: boolean;
    reasons: readonly string[];
    /**
     * Çekirdek gerekçeleri KENDİ "Gönderim engelli" kutusunda da listelesin mi?
     * Varsayılan `true`. Dış modül gerekçeleri kendi bloğunda (ör. İ:493-510 kontrol
     * çubuğu) gösteriyorsa `false` verir — aynı bilgi iki kez görünmez. (S4)
     */
    showReasonsInCore?: boolean;
  } | null;
  lineColumns?: DiaryLineColumns | null;
  itemMeta?: DiaryItemMeta | null;
  /** Kart ızgarasının ALTINDA tam genişlik blok (Saat Dağıtımı + Gönder kontrol çubuğu). */
  fullWidthBlock?: ReactNode;
  /** Başlığın ALTINDA, kartlardan önce bant (İ:150-155 — ör. formen bandı). (S3) */
  topBanner?: ReactNode;
  /**
   * Çekirdek KENDİ kaydından (taslak ya da "Kaydet & Gönder") HEMEN ÖNCE çağırır
   * ve bekler (S1 — mockup'ta tek düğme dağıtımı da yazar). Reddedilirse
   * (throw) çekirdek KENDİ kaydını YAPMAZ ve hatayı mevcut hata yolunda
   * gösterir — yarım kayıt olmaz. Kaydedilecek bir şey yoksa hemen çözülür.
   */
  onBeforeSave?: () => Promise<void>;
}

/** `DiaryEntryScreen` ve iki rota sarmalayıcısının kabul ettiği uzantı prop'ları. */
export interface DiaryExtensionProps {
  extension?: DiaryExtension;
  onExtensionContext?: (ctx: DiaryExtensionContext) => void;
}
