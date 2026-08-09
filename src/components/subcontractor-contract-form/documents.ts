/**
 * FSO 190-230 · "📎 Sözleşme Belgeleri" kartının içeriği — ALTI kutu BİREBİR
 * (193-228), iki sütun (192).
 *
 * ONAYLI KARAR (görev emri): belge YÜKLEME bu dilimde YOKTUR. BC (Belge
 * Çekirdeği) backend'i canlıdır ama FORM SLOT'u (kayıt oluşmadan önce dosya
 * iliştirme) sonraki dilimin işidir. Üst kural gereği altı kutu SİLİNMEZ —
 * çizilir, `aria-disabled` basılır ve gerekçe kutuların `title`ında görünür.
 *
 * Mockup'ta iki kutuda zorunluluk yıldızı vardır (196 "İmzalı Sözleşme *",
 * 208 "SGK Borcu Yoktur Yazısı *"); yıldız BASILMAZ — yüklenemeyen bir alanı
 * zorunlu göstermek yanlış olur (şantiye formu emsali, `site-form/
 * document-items.ts`).
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";

/** İkon zeminleri mockup satırlarından; hepsi MEVCUT token, yeni renk yok. */
export const CONTRACT_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "📄",
    iconBg: "var(--color-danger-soft)", // #fee2e2 (195)
    title: "İmzalı Sözleşme",
    subtitle: "Taraflarca imzalı PDF",
  },
  {
    emoji: "🛡",
    iconBg: "var(--color-success-soft)", // #dcfce7 (201)
    title: "Teminat Mektubu",
    subtitle: "Banka teminatı veya senet",
  },
  {
    emoji: "🏥",
    iconBg: "var(--color-warning-soft)", // #fef3c7 (207)
    title: "SGK Borcu Yoktur Yazısı",
    subtitle: "Son 30 gün içinde alınmış",
  },
  {
    emoji: "🏛",
    iconBg: "var(--color-primary-soft)", // #dbeafe (213)
    title: "Vergi Levhası & Sicil",
    subtitle: "Ticaret sicil gazetesi",
  },
  {
    emoji: "📋",
    iconBg: "var(--color-accent-purple-soft)", // #ede9fe (219)
    title: "İş Güvenliği Taahhütnamesi",
    subtitle: "İSG sorumluluk beyanı",
  },
  {
    emoji: "📊",
    iconBg: "var(--color-success-tint)", // #f0fdf4 (225)
    title: "Birim Fiyat Analizi",
    subtitle: "Taşeron teklifi / analiz tablosu",
  },
];

export const CONTRACT_DOCUMENTS_TITLE = "📎 Sözleşme Belgeleri"; // 191

export const CONTRACT_DOCUMENTS_NOTE =
  "Belge yükleme sonraki dilimde açılacak — sözleşmeyi oluşturduktan sonra belgeleri ekleyebileceksiniz.";

/**
 * Mockup'ta kartın kendi "sürükle" kutusu YOKTUR (yalnız altı kutu); ortak
 * yüzey `DocumentsPlaceholderCard` bir sürükle satırı bastığı için metinleri
 * bu kartın kapsamına göre yazılır.
 */
export const CONTRACT_DOCUMENTS_DROP_TITLE = "Diğer sözleşme eklerini sürükleyin";

export const CONTRACT_DOCUMENTS_DROP_SUBTITLE = "Zeyilname, ek protokol, yazışma vb.";

export const CONTRACT_DOCUMENTS_SOON_TITLE =
  "Belge yükleme bu ekranda henüz açılmadı (belge form-slot'u sonraki dilimin işi)";
