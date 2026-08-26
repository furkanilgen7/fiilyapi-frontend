// @vitest-environment node
//
// 🔴🔴 TEST İKİZİNİN DÖNÜŞ TİPİ BEKÇİSİ — `e2e/mock-backend.ts`.
//
// GEREKÇE ÖLÇÜLDÜ. `mock-backend.ts` bu deponun test ikizidir: e2e testleri
// gerçek backend'e değil ona konuşur. Bir üreticinin dönüş tipi yazılmamışsa
// TypeScript o gövdeyi SÖZLEŞMEYLE HİÇ KARŞILAŞTIRMAZ — ikiz sözleşmeden
// saptığında dört kapının dördü de yeşil kalır.
//
// Sınıfın canlı bedeli: F-MKD diliminde `equipment_id` süzgeci ikizin iki
// ucunda eksikti ve ekran FİLONUN TOPLAM YAKITINI tek makinenin tüketimi gibi
// bastı; kusuru yalnız kareye BAKMAK gösterdi. Kanon (K-MKD2): **bir
// süzgeç/korkuluk İKİZDE yoksa, olmadığını hiçbir kapı söylemez.**
//
// Bu bekçi tipsiz üreticiyi DERLEME ZAMANINA taşır: yeni bir üretici tipsiz
// eklenirse burada kırmızı verir.
//
// ⚠️ NE YAPMAZ: sözleşme kısıtı (`maximum`/`pattern`/`minLength`) üretilen TS
// tipinde YAŞAMAZ. Tip bağlamak korkuluk bağlamak DEĞİLDİR; o iş
// `form-limits.contract.test.ts`in kaydındadır.
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const TWIN = path.join(process.cwd(), "e2e", "mock-backend.ts");

interface TwinFunction {
  readonly name: string;
  readonly line: number;
  readonly returnType: string | null;
}

/** İkizi DİSKTEN okur ve AST'den fonksiyon bildirimlerini toplar. */
function twinFunctions(): readonly TwinFunction[] {
  const source = ts.createSourceFile(
    TWIN,
    readFileSync(TWIN, "utf8"),
    ts.ScriptTarget.ESNext,
    true,
  );
  const found: TwinFunction[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      found.push({
        name: node.name.text,
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        returnType: node.type === undefined ? null : node.type.getText(),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const FUNCTIONS = twinFunctions();

/* ═══════════ SÖZLEŞMEDEN SAPAN ÜRETİCİLER — AÇIK BORÇ KAYDI ════════════════
 * 🔴 Buradaki her ad, TB-MOCKTIP'te tipi bağlanmaya ÇALIŞILMIŞ ve `typecheck`
 * KIRMIZI VERMİŞ bir üreticidir. Kırmızı bir kusur değil, **ikizin
 * sözleşmeden saptığının kanıtıdır**. Sapmayı `as any` ile gizlemek yerine
 * gerekçesiyle buraya yazılır.
 *
 * 🔑 KAYIT İKİ YÖNLÜ ÇALIŞIR: bir ad buraya yazılıp da o üretici SONRADAN
 * tiplenirse (ya da adı değişirse) bu dosya KIRMIZI verir — bayat kayıt
 * sessizce birikemez.
 *
 * Bir adı buradan silmenin TEK yolu sapmayı gerçekten kapatmaktır. Sapmaların
 * çoğu ikizin DÖNDÜRDÜĞÜ VERİYİ değiştirir; o bir davranış değişikliğidir ve
 * kendi diliminde, kare ölçümüyle yapılır.
 * ========================================================================= */
const SOZLESMEDEN_SAPAN: Readonly<Record<string, string>> = {
  buildSectionDetail:
    "`section_type` ikizde `string | null`, sözleşmede 7 üyeli enum. Yazma ucu " +
    "(`String(body.section_type)`) sözleşme dışı her metni KABUL EDİYOR ⇒ ikiz " +
    "onaylayıcı, bekçi değil. Girdi korkuluğu F-KISIT kaydının işidir.",
  buildDiaryEntryDetail:
    "`weather` ikizde `string | null`, sözleşmede 5 üyeli enum; yazma ucu " +
    "(`body.weather as string | null`) her metni kabul ediyor. Aynı sınıf.",
  buildDiaryEntryListItem: "aynı `weather` sapması (liste ucu).",
  buildSitePlanWeek:
    "plan hücresi `tag` ikizde `string | null`, sözleşmede 6 üyeli enum; yazma " +
    "ucu `typeof raw.tag === 'string' ? raw.tag : null` her metni kabul ediyor.",
};

describe("🔴 test ikizi (`e2e/mock-backend.ts`) dönüş tipleri ↔ sözleşme", () => {
  it("bekçi GERÇEKTEN ölçüyor (boş küme sessizce yeşil geçemez)", () => {
    // 🔴 Kapsam korkuluğu: AST taraması bozulursa (dosya taşınır, `ts` API'si
    // değişir, üretici deseni kırılır) aşağıdaki `it`ler BOŞ küme üzerinde
    // koşar ve dosya "yeşil" görünürdü — bekçinin KENDİSİ sahte-yeşile
    // düşerdi. Sayılar 2026-08-26'da ÖLÇÜLMÜŞTÜR; aşağı inerlerse tarama
    // bozulmuş demektir.
    expect(FUNCTIONS.length, "ikizdeki fonksiyon bildirimi sayısı").toBeGreaterThanOrEqual(195);
    const bound = FUNCTIONS.filter(
      (fn) => fn.returnType !== null && fn.returnType.includes('components["schemas"]'),
    );
    expect(bound.length, "sözleşme tipine BAĞLI dönüş tipi sayısı").toBeGreaterThanOrEqual(55);
    expect(Object.keys(SOZLESMEDEN_SAPAN).length).toBeGreaterThan(0);
  });

  it("her fonksiyonun dönüş tipi YAZILIDIR (kayıttakiler hariç)", () => {
    const untyped = FUNCTIONS.filter(
      (fn) => fn.returnType === null && SOZLESMEDEN_SAPAN[fn.name] === undefined,
    ).map((fn) => `${fn.name} (mock-backend.ts:${fn.line})`);
    expect(
      untyped,
      "dönüş tipi YAZILMAMIŞ fonksiyon(lar) — tipsiz üretici sözleşmeyle HİÇ " +
        "karşılaştırılmaz, ikiz sapsa bile dört kapı yeşil kalır. Tipi " +
        "`components[\"schemas\"][...]`e bağla; bağlayınca `typecheck` kırmızı " +
        "veriyorsa bu SENİN kusurun DEĞİL, ikizin sapmasının kanıtıdır — " +
        "`SOZLESMEDEN_SAPAN` kaydına GEREKÇESİYLE yaz.",
    ).toEqual([]);
  });

  it("borç kaydında BAYAT ad yoktur (kayıt iki yönlü)", () => {
    const byName = new Map(FUNCTIONS.map((fn) => [fn.name, fn]));
    const stale: string[] = [];
    for (const name of Object.keys(SOZLESMEDEN_SAPAN)) {
      const fn = byName.get(name);
      if (fn === undefined) {
        stale.push(`${name}: ikizde BÖYLE BİR FONKSİYON YOK (silinmiş/yeniden adlandırılmış)`);
        continue;
      }
      if (fn.returnType !== null) {
        stale.push(`${name}: artık tipli (\`${fn.returnType}\`) — kayıttan SİL`);
      }
    }
    expect(
      stale,
      "borç kaydı gerçeklikten ayrıştı — tek yönlü bekçi bunu göremezdi: " +
        "kapatılmış bir sapma kayıtta kalırsa borç OLDUĞUNDAN BÜYÜK görünür.",
    ).toEqual([]);
  });

  it("her kayıt satırı GEREKÇE taşır (susturma değil, karar)", () => {
    const bare = Object.entries(SOZLESMEDEN_SAPAN)
      .filter(([, reason]) => reason.trim().length < 30)
      .map(([name]) => name);
    expect(bare, "gerekçesiz kayıt = susturma").toEqual([]);
  });
});
