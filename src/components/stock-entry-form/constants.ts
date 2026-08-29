/**
 * F-ST T4 · Stok Girişi formunun (SG = `projedesign/Form - Stok Girisi.dc.html`)
 * SABİT metinleri. Parantez içi sayılar O DOSYANIN satır numaralarıdır.
 *
 * Ekran bileşenleri kendi cümlelerini gömmez; hepsi buradan gelir (F-P5/F-BC
 * deseni) — böylece pending gerekçeleri tek yerden okunur ve testler aynı
 * kaynağı iddia eder.
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";
import type { StockEntryType, StockQuality } from "@/lib/api/hooks/useStockMutations";
import { pendingModuleLabel } from "@/lib/pending-modules";

/** Boş/─ hücre işareti — E3/ŞS tablolarıyla aynı. */
export const EMPTY_VALUE = "—";

export const STOCK_ENTRY_TITLE = "Stok Girişi"; // 47
export const STOCK_ENTRY_SUBTITLE =
  "Şantiyeye gelen malzemeyi kaydet — irsaliye ve fatura eşleştirmesi yapılır"; // 48

export interface StockEntryTypeOption {
  value: StockEntryType;
  emoji: string;
  title: string;
  desc: string;
}

/**
 * Giriş tipi kartları (53-76). Metinler mockup'tan BİREBİR; değerler
 * `stock_entry_type` enum'udur (backend spec §2) — üçüncü bir tip İCAT EDİLMEZ.
 */
export const STOCK_ENTRY_TYPE_OPTIONS: readonly StockEntryTypeOption[] = [
  {
    value: "purchase",
    emoji: "📥", // 56
    title: "Satınalma Girişi", // 57
    desc: "Siparişten gelen malzeme", // 58
  },
  {
    value: "transfer",
    emoji: "🔄", // 64
    title: "Şantiye Transferi", // 65
    desc: "Başka şantiyeden gelen", // 66
  },
  {
    value: "adjustment",
    emoji: "✏️", // 72
    title: "Manuel Düzeltme", // 73
    desc: "Sayım farkı, iade vb.", // 74
  },
];

/** Kalite seçeneği (117) — ✓/⚠/✗ işaretleri mockup'tan, değerler enum'dan. */
export interface StockQualityOption {
  value: StockQuality;
  label: string;
}

export const STOCK_QUALITY_OPTIONS: readonly StockQualityOption[] = [
  { value: "ok", label: "✓ Uygun" },
  { value: "defective", label: "⚠ Kusurlu" },
  { value: "rejected", label: "✗ Red" },
];

/** openapi `StockEntryCreate` / `StockEntryLineCreate` uzunluk tavanları. */
export const MAX_LENGTH = {
  supplierName: 200,
  deliveryNoteNo: 50,
  /** Şema tavanı `Text(2000)` (backend spec §2 · TB4 standardı). */
  note: 2000,
} as const;

/* ── PENDING YÜZEYLER ─────────────────────────────────────────────────────
 * Aşağıdaki üç yüzeyin ORTAK kuralı (spec §5 S5 · F-PT deseni): mockup'taki
 * alan/kutu SİLİNMEZ, yerinde devre dışı + GÖRÜNÜR gerekçeyle basılır ve
 * **`POST /stock/entries` gövdesine HİÇBİR anahtar eklemez**. Bunun yapısal
 * güvencesi `form-state.ts`tedir: bu yüzeylerin form durumunda KARŞILIĞI YOK.
 * ---------------------------------------------------------------------- */

/** 85 "İlgili Sipariş" — sipariş kataloğu SATINALMA dilimindedir. */
export const STOCK_ENTRY_ORDER_PENDING_REASON = pendingModuleLabel("purchasing");

/** 85 alt ipucu — mockup'ın kendi cümlesi ("Seçilirse kalemler otomatik dolar"). */
export const STOCK_ENTRY_ORDER_HINT = "Seçilirse kalemler otomatik dolar";

/** 102/113 "Sipariş" sütunu — aynı gerekçe, satır düzeyinde. */
export const STOCK_ENTRY_ORDER_COLUMN_PENDING_REASON = STOCK_ENTRY_ORDER_PENDING_REASON;

/** 176 "otomatik bildirim" kutucuğu — bildirim SATINALMA dilimindedir. */
export const STOCK_ENTRY_NOTIFY_LABEL =
  "Eksik kalemler için tedarikçiye otomatik bildirim gönder"; // 177
export const STOCK_ENTRY_NOTIFY_PENDING_REASON = STOCK_ENTRY_ORDER_PENDING_REASON;

/** 149-166 belge kutuları — BC form-slot bağı henüz YOK. */
export const STOCK_ENTRY_DOCUMENTS_TITLE = "📎 Belgeler"; // 150
export const STOCK_ENTRY_DOCUMENTS_PENDING_REASON = pendingModuleLabel("documents");

export const STOCK_ENTRY_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "📄",
    iconBg: "var(--color-danger-soft)", // #fee2e2 (154)
    title: "İrsaliye", // 155
    subtitle: "Fotoğraf veya PDF", // 155
  },
  {
    emoji: "🧾",
    iconBg: "var(--color-primary-soft)", // #dbeafe (159)
    title: "Fatura", // 160
    subtitle: "Sonra da eklenebilir", // 160
  },
  {
    emoji: "📷",
    iconBg: "var(--color-success-soft)", // #dcfce7 (164)
    title: "Teslim Fotoğrafı", // 165
    subtitle: "Malzeme durumu", // 165
  },
];

/**
 * Tedarikçi alanı (86) mockup'ta bir SELECT'tir ama STOK GİRİŞİ UCUNDA tedarikçi
 * KATALOĞU YOKTUR: `supplier_name` SERBEST METİNDİR (backend spec §7 S3).
 * Uydurma bir seçenek listesi basmak yerine metin kutusu + bu ipucu gösterilir.
 *
 * 🔴 F-UNIT1 T5 · GEREKÇE DÜZELTİLDİ. Eski metin ("Satınalma modülüyle gelir")
 * BAYATTI: `/satinalma/tedarikciler` CANLI ve gerçek tedarikçi kartları basıyor.
 * Eksik olan modül değil, `StockEntryCreate` gövdesinin tedarikçi KİMLİĞİ
 * taşımaması — alan hâlâ serbest metindir.
 */
export const STOCK_ENTRY_SUPPLIER_HINT =
  "Stok girişi tedarikçi kimliği taşımıyor — ad serbest metin olarak yazılır";

/** Şantiyeye tanımlı depo yoksa (boş kurulum kilidi, spec §5 S3). */
export const STOCK_ENTRY_NO_WAREHOUSE_NOTICE =
  "Bu şantiyeye tanımlı depo yok — “Stok & Depo” ekranındaki “+ Depo Ekle” ile bir depo açın.";

/** Depo listesi hiç yüklenemediğinde (sessiz boş açılır liste yasak). */
export const STOCK_ENTRY_WAREHOUSE_LOAD_ERROR =
  "Depo listesi yüklenemedi — sayfayı tazeleyip tekrar deneyin.";

/* ── STOK-BOLUM · SATIR BAZINDA BÖLÜM / İŞ KALEMİ ATFI ────────────────────
 * 🔴 BU İKİ SÜTUNUN MOCKUP'I YOKTUR. `Form - Stok Girisi.dc.html` kalem
 * tablosunda "Bölüm" ya da "İş Kalemi" sütunu ÇİZİLMEMİŞTİR (sütunlar 99-108:
 * Malzeme · Birim · Sipariş · Gelen · Birim Fiyat · Tutar · Kalite).
 *
 * Repo kuralı gereği yeni bir görsel dil İCAT EDİLMEDİ: sütunlar tablonun KENDİ
 * desenini genişletir — `Select size="row"` + satır başına `aria-label` +
 * `data-testid`, yani "Malzeme" ve "Kalite" sütunlarıyla BİREBİR aynı kabuk.
 * Yeni bir primitive, yeni bir yerleşim ya da yeni bir renk kararı YOKTUR.
 * ---------------------------------------------------------------------- */

/** 🔴 `transfer`da atıf YASAKTIR — alanlar devre dışıdır ve gerekçe GÖRÜNÜR. */
export const STOCK_ENTRY_TRANSFER_NO_ATTRIBUTION_REASON =
  "Transferde bölüm/iş kalemi atfı yapılmaz — transfer tüketim değildir, iki bacaklıdır";

/** Bölüm listesi yüklenemediğinde (sessiz boş açılır liste YASAK). */
export const STOCK_ENTRY_SECTION_LOAD_ERROR =
  "Bölüm listesi yüklenemedi — atıf yapmadan da kaydedebilirsiniz.";

/** Şantiyede hiç bölüm yoksa. Atıf ZORUNLU DEĞİLDİR, bu yüzden kilit DEĞİL uyarıdır. */
export const STOCK_ENTRY_NO_SECTION_NOTICE =
  "Bu şantiyede tanımlı bölüm yok — malzeme bölüm atfı olmadan kaydedilir.";

/** İş kalemi listesi yüklenemediğinde. */
export const STOCK_ENTRY_BOQ_LOAD_ERROR =
  "İş kalemi listesi yüklenemedi — atıf yapmadan da kaydedebilirsiniz.";

/**
 * 🔴 POZ LİSTESİ BÖLÜME GÖRE SÜZÜLMEZ — FAIL-OPEN KORUNUR.
 *
 * Backend tahsisi (`boq_item_section_allocations`) ARAMAZ ve gerekçesi
 * yazılıdır: *"tahsis şartı konsaydı planlama yapılmamış bir şantiye hiç
 * malzeme çıkışı yazamazdı — kayıt, planın rehinesi olurdu."* İstemci bu kararı
 * DARALTMAZ: seçilen bölüme tahsis EDİLMEMİŞ pozlar da listede kalır.
 */
export const STOCK_ENTRY_BOQ_FAIL_OPEN_HINT =
  "İş kalemi listesi bölüme göre daraltılmaz — tahsis edilmemiş poz da seçilebilir";
