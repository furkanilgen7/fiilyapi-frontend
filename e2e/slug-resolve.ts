/**
 * URL-3 · TEST İKİZİNİN slug ÇÖZÜCÜSÜ (K-IKIZ2).
 *
 * KÖK OLAY: `/projeler/<uuid>` yolu ad slug'ına geçiyor. Gerçek backend
 * (URL-2, `04f50c1`) YALNIZ ÜÇ okuma ucunda "UUID **ya da** slug" kabul eder:
 * `GET /projects/{project_id}` · `GET /sites/{site_id}` · `GET /sections/{section_id}`.
 * Kalan 42 yol parametresi UUID BEKLER.
 *
 * 🔴 İKİZ GERÇEĞİN HEM İZİN VERDİĞİNİ HEM REDDETTİĞİNİ TAŞIMALIDIR. İkiz
 * slug'ı HER YERDE çözseydi, ekran bir slug'ı UUID bekleyen bir uca geçirdiğinde
 * e2e YEŞİL kalır, kusur YALNIZ CANLIDA görünürdü. Bu yüzden çözücü SADECE o üç
 * ucun gövdesinde çağrılır; öteki uçlar `id` ile eşleşmeye devam eder.
 *
 * ─── Kapsam ve fail-closed ──────────────────────────────────────────────────
 * `sites.slug` PROJE İÇİNDE, `sections.slug` ŞANTİYE İÇİNDE tekildir — KÜRESEL
 * değil. Düz uçlar bu yüzden kapsam sorgu parametresi alır
 * (`/sites/<slug>?project=`, `/sections/<slug>?site=&project=`). Kapsam
 * daraltıldıktan sonra aday sayısı 1 DEĞİLSE sonuç YOKTUR (404) — rastgele
 * seçim YOKTUR. Bu "fail-closed"dır ve gerçek backend'in davranışıdır.
 *
 * ─── `slug` NULLABLE ────────────────────────────────────────────────────────
 * Adı slug'lanamayan kayıt `slug: null` taşır ve YALNIZ kimliğiyle yaşar.
 * `null` slug HİÇBİR anahtarla eşleşmez — özellikle boş/`"null"` metniyle de
 * eşleşmez (yoksa `?site=` unutulan bir çağrı yanlışlıkla o kaydı bulurdu).
 */

/** Çözücünün tanıdığı en küçük kayıt: kimlik + (olabilir) slug. */
export interface SlugKeyed {
  readonly id: string;
  readonly slug: string | null;
}

/**
 * Kimlik ÖNCE denenir: eski UUID linkleri (kullanıcı kararı — bookmark'lar
 * ölmez) ve slug'ı `null` olan kayıtlar bu daldan geçer. Kimlik eşleşmesi
 * kapsamdan BAĞIMSIZDIR; kimlik zaten küresel tekildir.
 */
function byId<T extends SlugKeyed>(rows: readonly T[], key: string): T | null {
  return rows.find((row) => row.id === key) ?? null;
}

/**
 * Bir anahtarı (UUID **ya da** slug) tek kayda çözer.
 *
 * @param rows   çözüm uzayı — çağıran tarafından KAPSAMA daraltılmış olmalıdır
 *               (proje içindeki şantiyeler, şantiye içindeki bölümler).
 * @param key    URL'den gelen ham anahtar.
 * @returns      tek aday varsa kayıt; aday yoksa **veya birden çoksa** `null`.
 */
export function resolveByIdOrSlug<T extends SlugKeyed>(
  rows: readonly T[],
  key: string,
): T | null {
  if (key === "") return null;
  const exact = byId(rows, key);
  if (exact !== null) return exact;
  // `slug === null` olan kayıtlar burada ELENİR: `row.slug === key` karşılaştırması
  // `key` bir string olduğu için `null`la asla tutmaz — ama niyeti açık bırakmak
  // (ve ileride `key`in tipi gevşerse sessizce bozulmamak) için ayrıca süzülür.
  const candidates = rows.filter((row) => row.slug !== null && row.slug === key);
  // 🔴 FAIL-CLOSED: belirsizlik SEÇİLMEZ, 404'tür. `candidates[0]` yazmak bu
  // dosyadaki tek gerçek tuzaktı — kapsamı unutan bir çağrı sessizce YANLIŞ
  // kaydı açardı ve kullanıcı başka bir projenin şantiyesini görürdü.
  return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Adı URL'de taşınabilir bir slug'a çevirir; hiçbir harf kalmazsa `null`
 * döndürür (gerçek backend'in `slug` sütunu NULLABLE'dır, tam olarak bu yüzden).
 *
 * Türkçe harfler ASCII'ye indirgenir — `encodeURIComponent` onları taşırdı ama
 * `%C3%A7` biçimi kullanıcıya okunur bir URL VERMEZ, ki bu dilimin TEK amacı odur.
 */
const TR_MAP: Readonly<Record<string, string>> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i", ö: "o", Ö: "o",
  ş: "s", Ş: "s", ü: "u", Ü: "u",
};

export function slugify(name: string): string | null {
  const ascii = [...name].map((ch) => TR_MAP[ch] ?? ch).join("");
  const slug = ascii
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? null : slug;
}
