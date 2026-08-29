// @vitest-environment node
//
// URL-3 · TEST İKİZİNİN slug ÇÖZÜCÜSÜNÜN BEKÇİSİ (K-IKIZ2).
//
// NEDEN AYRI BİR BİRİM TESTİ: çözücünün en tehlikeli dalı — **belirsiz slug**
// — e2e'den ULAŞILAMAZ. Belirsizlik iki kaydın AYNI slug'ı taşımasını
// gerektirir; ikizin fikstürlerine ikinci bir şantiye eklemek ise küresel
// şantiye seçicisini sayan `form-dialogs-visual.spec.ts`i kırar (ikizin kendi
// dosyasındaki "🔴 BURAYA `s-p2-1` EKLENMEZ" kaydı bu bedeli ölçmüş).
// Dolayısıyla fail-closed dalı ancak durumu ELDE kuran bir birim testinden
// kanıtlanabilir.
//
// ⚠️ DÜRÜST SINIR: bu test ile ikiz AYNI modülü paylaşır, yani bu iddia
// "ikiz doğru davranıyor"u DEĞİL "çözücü doğru davranıyor"u ölçer. İkizin o
// çözücüyü GERÇEKTEN çağırdığını ölçen ayrı bir katman vardır: slug'lı ve
// UUID'li URL'lerle gezinen e2e (`project-slug-url.spec.ts`). İki katman
// bilerek ayrı tutulmuştur — biri kayarsa öteki durur.
import { describe, expect, it } from "vitest";

import { resolveByIdOrSlug, slugify, type SlugKeyed } from "../../e2e/slug-resolve";

const P1: SlugKeyed = { id: "p-1", slug: "kule-a" };
const P2: SlugKeyed = { id: "p-2", slug: "villa-b" };
/** Adı slug'lanamayan kayıt — canlıda `slug` NULLABLE'dır. */
const NULL_SLUG: SlugKeyed = { id: "p-3", slug: null };

describe("ikiz slug cozucusu — UUID VE slug, belirsizlikte fail-closed", () => {
  it("POZITIF KONTROL 1 — slug ANAHTARI kaydi bulur", () => {
    expect(resolveByIdOrSlug([P1, P2], "kule-a")).toBe(P1);
  });

  it("POZITIF KONTROL 2 — ESKI UUID/id ANAHTARI calismaya DEVAM eder", () => {
    // 🔴 Kullanıcı kararı: paylaşılmış eski linkler ölmez. Bu iddia düşerse
    // bookmark'lar bozulur ve kusur ancak kullanıcı tıklayınca görülür.
    expect(resolveByIdOrSlug([P1, P2], "p-1")).toBe(P1);
    expect(resolveByIdOrSlug([P1, P2], "p-2")).toBe(P2);
  });

  it("POZITIF KONTROL 3 — slug'i NULL olan kayit KIMLIGIYLE yasar", () => {
    expect(resolveByIdOrSlug([P1, NULL_SLUG], "p-3")).toBe(NULL_SLUG);
  });

  it("slug'i NULL olan kayit bos/`null` metniyle BULUNMAZ", () => {
    // `row.slug === key` yazıp `null` süzgecini atlayan bir uygulama burada
    // hâlâ yeşil geçerdi; asıl bedel aşağıdaki belirsizlik dalındadır.
    expect(resolveByIdOrSlug([NULL_SLUG], "")).toBeNull();
    expect(resolveByIdOrSlug([NULL_SLUG], "null")).toBeNull();
  });

  // ─── ASIL İDDİA ───────────────────────────────────────────────────────────
  it("🔴 BELIRSIZ slug FAIL-CLOSED — ilk aday SECILMEZ, sonuc YOKTUR", () => {
    // İki AYRI projenin şantiyesi aynı slug'ı taşıyabilir (`sites.slug` proje
    // İÇİNDE tekildir, küresel DEĞİL). Kapsam verilmemişse cevap 404 olmalıdır.
    const ambiguous: SlugKeyed[] = [
      { id: "s-1", slug: "a-blok-santiyesi" },
      { id: "s-9", slug: "a-blok-santiyesi" },
    ];
    // `candidates[0]` dönen bir mutant BURADA ölür: kullanıcı sessizce BAŞKA
    // bir projenin şantiyesini görürdü.
    expect(resolveByIdOrSlug(ambiguous, "a-blok-santiyesi")).toBeNull();
  });

  it("KAPSAM daraltmasi belirsizligi COZER (cagiran suzer, cozucu secmez)", () => {
    const scoped: SlugKeyed[] = [{ id: "s-1", slug: "a-blok-santiyesi" }];
    expect(resolveByIdOrSlug(scoped, "a-blok-santiyesi")).toEqual(scoped[0]);
  });

  it("KIMLIK eslesmesi belirsizlikten ETKILENMEZ", () => {
    const ambiguous: SlugKeyed[] = [
      { id: "s-1", slug: "ayni" },
      { id: "s-9", slug: "ayni" },
    ];
    expect(resolveByIdOrSlug(ambiguous, "s-9")?.id).toBe("s-9");
  });

  it("bilinmeyen anahtar NULL doner (404)", () => {
    expect(resolveByIdOrSlug([P1], "yok-boyle-bir-sey")).toBeNull();
    expect(resolveByIdOrSlug([], "kule-a")).toBeNull();
  });
});

describe("slugify — ad -> URL'de tasinabilir anahtar", () => {
  it("Turkce harfleri ASCII'ye indirger (yuzde kacisi URL'yi OKUNMAZ yapardi)", () => {
    expect(slugify("Köprü Güçlendirme")).toBe("kopru-guclendirme");
    expect(slugify("A-Blok Şantiyesi")).toBe("a-blok-santiyesi");
    expect(slugify("ÖRNEK SANAYİ SİTESİ")).toBe("ornek-sanayi-sitesi");
  });

  it("NOKTASIZ `\u0131` ASCII `i` olur — Unicode ayristirmasi bunu YAPAMAZ", () => {
    // \u{1F534} MUTASYONLA OLCULDU: `TR_MAP`siz bir uygulama yukaridaki uc adin
    // ucunde de YESIL kalir, cunku `normalize("NFD")` c/o/u/g/s harflerini
    // kendiliginden ayristirir. Ayristirilamayan TEK harf noktasiz `\u0131`dir:
    // `[^a-z0-9]` onu TIREYE cevirir ve "Isikli" -> "s-kl" gibi SAKAT bir slug
    // dogar. Bu iddia olmadan `TR_MAP` OLU KOD sanilip silinebilirdi.
    expect(slugify("I\u015F\u0131kl\u0131 Cadde")).toBe("isikli-cadde");
    expect(slugify("Kar\u015Fiyaka \u0131\u0131\u0131")).toBe("karsiyaka-iii");
  });

  it("harf kalmayan adda NULL doner — `slug` sutunu NULLABLE'dir", () => {
    expect(slugify("!!! ???")).toBeNull();
    expect(slugify("")).toBeNull();
  });

  it("bas/son tireleri ve tekrarlari temizler", () => {
    expect(slugify("  Kat 6–10  Kaba  İnşaat  ")).toBe("kat-6-10-kaba-insaat");
  });
});
