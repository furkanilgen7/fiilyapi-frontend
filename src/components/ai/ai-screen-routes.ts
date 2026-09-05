import { routes } from "@/lib/routes";

/**
 * Backend **ekran anahtarı** → uygulama yolu (AI-CHAT-2 / K1).
 *
 * 🔴 **DERİN BAĞLANTI HEDEFİ MODELDEN GELMEZ.** Backend yalnız kapalı bir
 * enum üyesi gönderir (`app/modules/ai/navigation.py::EkranAnahtari`); URL
 * burada, **bilinen rota kataloğundan** kurulur. Serbest bir URL alanı olsaydı
 * model ekranda "Stok girişi" yazarken altta `/ayarlar/izin-matrisi`
 * durdurabilirdi (kimlik avı / confused deputy, S22).
 *
 * 🔴 Elle dize kurulmaz: her değer `routes.*` çağrısıdır. Bunun ayrı bir
 * bekçisi de var (`src/test-guards/internal-url-guard.test.ts`).
 *
 * ## 🔴 ÖLÇÜM: İKİ ANAHTAR ÇÖZÜLEMİYOR — ve bu SESSİZ KALMAZ
 *
 * `EkranAnahtari` **15** üye taşır; rota kataloğunda **13'ünün** parametresiz
 * bir karşılığı var. `santiyeler` ve `santiye_gunlugu` yalnız bir proje/şantiye
 * kimliği altında yaşıyor (`routes.projects.sites.*`), yani parametresiz bir
 * "şantiyeler" ekranı YOKTUR. Uydurulmuş bir yol basmak yerine bu iki anahtar
 * `null` döner ve bağlantı **devre dışı + sebep** basılır — kanon: "rotası
 * olmayan mockup öğesi SİLİNMEZ, devre-dışı basılır".
 *
 * Küme eşitliğinin bekçisi `ai-screen-routes.test.ts`tir: backend enum'a yeni
 * bir üye eklerse ve buraya girmezse test KIRMIZI olur — bugün böyle bir bekçi
 * YOKTU ve iki depo sessizce ayrışabilirdi.
 */

/** Backend `EkranAnahtari` üyeleri — sözleşmenin frontend'deki ikizi. */
export const EKRAN_ANAHTARLARI = [
  "gosterge_paneli",
  "onay_kutusu",
  "projeler",
  "santiyeler",
  "puantaj",
  "santiye_gunlugu",
  "stok",
  "hakedisler",
  "faturalar",
  "hazine",
  "muhasebe",
  "makineler",
  "belgeler",
  // 🔴 AI-2b: backend `taseron_hakedisleri` aracıyla birlikte eklendi.
  // Bu satır YOKKEN backend enum'u 15, buradaki küme 14 üyeydi ve anahtar
  // bilinmeyen dalına düşüp genel yedeği basıyordu ("Bu ekranın uygulamada bir
  // rotası henüz yok") — oysa rota VARDI (`/hakedisler/taseron`). İki deponun
  // sessiz ayrışmasının ta kendisi.
  "taseron_hakedisleri",
  "ayarlar",
] as const;

export type EkranAnahtari = (typeof EKRAN_ANAHTARLARI)[number];

/** Parametresiz bir yolu olmayan anahtarlar ve **sebebi** (ekranda görünür). */
export const COZULEMEYEN_EKRANLAR: Readonly<Record<string, string>> = {
  santiyeler: "Şantiye listesi bir projenin altında açılır; tek başına bir ekranı yok.",
  santiye_gunlugu: "Şantiye günlüğü bir şantiyenin altında açılır; tek başına bir ekranı yok.",
};

const COZUCULER: Readonly<Record<EkranAnahtari, (() => string) | null>> = {
  gosterge_paneli: () => routes.home(),
  onay_kutusu: () => routes.approvalInbox(),
  projeler: () => routes.projects.list(),
  santiyeler: null,
  puantaj: () => routes.timesheet(),
  santiye_gunlugu: null,
  stok: () => routes.stock(),
  hakedisler: () => routes.progressPayments.list(),
  faturalar: () => routes.invoices.list(),
  hazine: () => routes.treasury.root(),
  muhasebe: () => routes.accounting.root(),
  makineler: () => routes.equipment.list(),
  belgeler: () => routes.documents(),
  // 🔴 `hakedisler` İŞVEREN tarafıdır; taşeron AYRI bir ekrandır. Tek anahtara
  // indirmek kullanıcıyı yanlış listeye götürürdü.
  taseron_hakedisleri: () => routes.progressPayments.subcontractor.list(),
  ayarlar: () => routes.settings.root(),
};

/**
 * Ekran anahtarını yola çevirir. 🔴 Tanınmayan anahtar `null` döner — **asla**
 * bir tahmin üretmez. Backend bir gün yeni bir üye eklerse ve bu dosya
 * güncellenmezse kullanıcı ölü bir bağlantı değil, sebebi yazan kapalı bir
 * düğme görür.
 */
export function ekranYolu(ekran: string): string | null {
  const cozucu = (COZUCULER as Record<string, (() => string) | null | undefined>)[ekran];
  return cozucu ? cozucu() : null;
}

/** Çözülemeyen anahtarın kullanıcıya dönük sebebi. */
export function ekranSebebi(ekran: string): string {
  return (
    COZUCULER[ekran as EkranAnahtari] === null
      ? COZULEMEYEN_EKRANLAR[ekran]
      : undefined
  ) ?? "Bu ekranın uygulamada bir rotası henüz yok.";
}
