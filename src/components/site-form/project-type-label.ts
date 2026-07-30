/**
 * "Bağlı Proje" bilgi kutusundaki proje tipi etiketi (mockup satır 56).
 *
 * NEDEN AYRI SÖZLÜK: `PROJECT_TABS` (`components/projects/tabs.ts`) **sekme
 * adlarının** kaynağıdır ve "Taahhüt / Kendi Yatırım / Kat Karşılığı" basar —
 * orada doğrudur, dokunulmaz. Bilgi kutusu ise mockup satır 56'da
 * `· Taahhüt Projesi` yazar. İki bağlam, iki dize; ikisi de tek kaynaktan.
 *
 * Mockup dayanakları:
 * - `taahhut` → "Form - Santiye Ekle.dc.html" satır 56 (birebir).
 * - `kendi_yatirim` → "Proje - Kendi Yatırım.dc.html" satır 57
 *   ("Kendi Yatırım Projesi:").
 * - `kat_karsiligi` → mockup'larda bu bağlamda bir örneği YOK; diğer ikisinin
 *   kanıtlı `{tip} Projesi` kalıbı uygulandı (spec §15/8a).
 */
export const PROJECT_TYPE_BANNER_LABELS: Readonly<Record<string, string>> = {
  taahhut: "Taahhüt Projesi",
  kendi_yatirim: "Kendi Yatırım Projesi",
  kat_karsiligi: "Kat Karşılığı Projesi",
};

/** Bilinmeyen tip **ham anahtarla** basılır — sessiz boş dize yasak. */
export function projectTypeBannerLabel(projectType: string): string {
  return PROJECT_TYPE_BANNER_LABELS[projectType] ?? projectType;
}
