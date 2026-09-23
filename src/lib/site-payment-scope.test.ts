import { describe, expect, test } from "vitest";

import { partitionSitePayments, projectWideNote } from "./site-payment-scope";

// KAYIT 454: bu dosya `lib/api/hooks/useSiteSubcontractorPayments.ts`
// (alt katman) TARAFINDAN kullanılır ve `components/` altındaki HİÇBİR
// modülü import ETMEZ — döngüsel bağımlılık burada yapısal olarak imkânsız.
function item(over: { contractSiteId: string | null; id: string }) {
  return over;
}

describe("partitionSitePayments (generic)", () => {
  test("contractSiteId dolu satır siteScoped'a girer", () => {
    const result = partitionSitePayments([item({ id: "a", contractSiteId: "site-1" })]);
    expect(result.siteScoped.map((i) => i.id)).toEqual(["a"]);
    expect(result.projectWide).toEqual([]);
  });

  test("contractSiteId null satır projectWide'a girer, kaybolmaz", () => {
    const result = partitionSitePayments([item({ id: "b", contractSiteId: null })]);
    expect(result.projectWide.map((i) => i.id)).toEqual(["b"]);
    expect(result.siteScoped).toEqual([]);
  });
});

describe("projectWideNote", () => {
  test("sıfırda not basılmaz", () => {
    expect(projectWideNote(0)).toBeNull();
  });

  test("pozitif sayıda not sayıyı ve 'eklenmez' ifadesini içerir", () => {
    const note = projectWideNote(3);
    expect(note).toContain("3");
    expect(note).toContain("eklenmez");
  });
});
