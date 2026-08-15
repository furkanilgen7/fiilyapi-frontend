/**
 * 📎 Belgeler kartının içeriği (mockup satır 122–201) — yer tutucu.
 *
 * Yüzey `form-shell/DocumentsPlaceholderCard`'dan gelir (şantiye/proje
 * formlarıyla AYNI desen); metinler forma özgü olduğu için burada durur.
 *
 * Bu dilimde yükleme YOKTUR: `<input type="file">` render edilmez, sürükleme
 * işleyicisi yazılmaz, gövdede belge anahtarı bulunmaz. Mockup'ın üç kutuda
 * gösterdiği zorunluluk yıldızı (130, 140, 150) BASILMAZ — şantiye formunda
 * alınan kararın aynısı: yüklenemeyen alanı zorunlu göstermek yanlış olur.
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";

/** İkon zeminleri mockup satırlarından; hepsi MEVCUT token, yeni renk yok. */
export const PERSONNEL_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "🪪",
    iconBg: "var(--color-danger-soft)", // #fee2e2 (128)
    title: "Kimlik Fotokopisi",
    subtitle: "PDF veya JPG · Maks 5 MB",
  },
  {
    emoji: "🏥",
    iconBg: "var(--color-danger-soft)", // #fee2e2 (138)
    title: "Sağlık Raporu",
    subtitle: "İşe giriş muayenesi · 1 yıl geçerli",
  },
  {
    emoji: "⛑",
    iconBg: "var(--color-warning-soft)", // #fef3c7 (148)
    title: "İSG Eğitim Sertifikası",
    subtitle: "Temel iş güvenliği · 3 yıl geçerli",
  },
  {
    emoji: "🎓",
    iconBg: "var(--color-success-soft)", // #dcfce7 (158)
    title: "Mesleki Yeterlilik Belgesi",
    subtitle: "MYK belgesi · Ustalar için zorunlu",
  },
  {
    emoji: "🚜",
    iconBg: "var(--color-accent-purple-soft)", // #ede9fe (168)
    title: "Operatör / Ehliyet Belgesi",
    subtitle: "Makine operatörleri için",
  },
  {
    emoji: "📄",
    iconBg: "var(--color-primary-soft)", // #dbeafe (178)
    title: "İş Sözleşmesi",
    subtitle: "İmzalı nüsha · Kayıt sonrası da yüklenebilir",
  },
];

/** Kart başlığı (123) — emoji dahil. */
export const PERSONNEL_DOCUMENTS_TITLE = "📎 Belgeler";

/**
 * Başlığın yanındaki not. Mockup'taki "İSG mevzuatı gereği zorunlu belgeler
 * işaretlenmiştir" (123) cümlesi KORUNUR, sonuna neden yüklenemediği eklenir.
 */
export const PERSONNEL_DOCUMENTS_NOTE =
  "İSG mevzuatı gereği zorunlu belgeler işaretlenmiştir — belge modülü bekleniyor, personeli kaydettikten sonra yükleyebileceksiniz.";

/** Genel sürükle-bırak kutusu (188–193). */
export const PERSONNEL_DOCUMENTS_DROP_TITLE = "Diğer belgeleri buraya sürükleyin";
export const PERSONNEL_DOCUMENTS_DROP_SUBTITLE =
  "Diploma, referans mektubu, adli sicil kaydı vb. · Çoklu seçim yapılabilir";

/**
 * Uyarı kutusu (195–200) — "Belge Takibi" bağlantısı EDİLGEN basılır.
 *
 * Mockup'taki `⚠` bu SABİTİN İÇİNDE DEĞİLDİR (F-SEM): sembol bir GLİF değil
 * bir İKONdur ve `PersonnelDocumentsCard` tarafında `WarningTriangleIcon`
 * olarak basılır. Sabit yalnız METNİ taşır — çeviri/metin denetimi bu dosyada
 * kalır, render kararı render tarafında.
 */
export const PERSONNEL_DOCUMENTS_WARNING_STRONG = "Zorunlu belgeler eksikse";
export const PERSONNEL_DOCUMENTS_WARNING_BEFORE_LINK =
  " personel sahaya çıkamaz. Belge geçerlilik süreleri ";
export const PERSONNEL_DOCUMENTS_WARNING_LINK = "Belge Takibi";
export const PERSONNEL_DOCUMENTS_WARNING_AFTER_LINK =
  " ekranından izlenir, bitişe 30 gün kala otomatik hatırlatma gider.";
