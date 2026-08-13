import { describe, expect, it } from "vitest";

import {
  buildPurchaseRequestCreateBody,
  buildPurchaseRequestLines,
  buildPurchaseRequestUpdateBody,
} from "./purchase-request-body";
import {
  createPurchaseRequestLine,
  emptyPurchaseRequestFormValues,
  type PurchaseRequestFormValues,
  type PurchaseRequestLineValues,
} from "./purchase-request-form-state";

function line(patch: Partial<PurchaseRequestLineValues>): PurchaseRequestLineValues {
  return { ...createPurchaseRequestLine(0), ...patch };
}

function filledValues(patch: Partial<PurchaseRequestFormValues> = {}): PurchaseRequestFormValues {
  return {
    ...emptyPurchaseRequestFormValues("2026-08-13"),
    projectId: "p-1",
    lines: [line({ stockItemId: "s-1", quantity: "15", unitPrice: "21500" })],
    ...patch,
  };
}

describe("buildPurchaseRequestLines — XOR ve gövde dışı alanlar", () => {
  it("stok kartlı kalem YALNIZ stock_item_id taşır (serbest metin anahtarları YOK)", () => {
    const [body] = buildPurchaseRequestLines([
      line({ source: "stock", stockItemId: "s-1", quantity: "15", unitPrice: "21500" }),
    ]);

    expect(Object.keys(body).sort()).toEqual(
      ["estimated_unit_price", "quantity", "stock_item_id"].sort(),
    );
  });

  it("serbest kalem YALNIZ free_text_* taşır (stock_item_id anahtarı YOK)", () => {
    const [body] = buildPurchaseRequestLines([
      line({
        source: "free",
        freeTextName: "  Özel kalıp  ",
        freeTextUnit: " Adet ",
        quantity: "3",
        unitPrice: "1200",
      }),
    ]);

    expect(Object.keys(body).sort()).toEqual(
      ["estimated_unit_price", "free_text_name", "free_text_unit", "quantity"].sort(),
    );
    expect(body.free_text_name).toBe("Özel kalıp");
    expect(body.free_text_unit).toBe("Adet");
  });

  it("`sort_order` GÖVDEYE GİRMEZ — sunucu dizinin indeksinden üretir", () => {
    const bodies = buildPurchaseRequestLines([
      line({ stockItemId: "s-1", quantity: "1", unitPrice: "1" }),
      line({ stockItemId: "s-2", quantity: "2", unitPrice: "2" }),
    ]);

    for (const body of bodies) {
      expect(body).not.toHaveProperty("sort_order");
    }
  });

  it("fiyatsız kalemde `estimated_unit_price` anahtarı HİÇ KURULMAZ (uydurma 0 yok)", () => {
    // 🔴 `0` yazmak eşiği "bilinen ve küçük" gösterirdi — NULL-EŞİK
    // KANONU'nun tam tersi.
    const [body] = buildPurchaseRequestLines([
      line({ stockItemId: "s-1", quantity: "15", unitPrice: "" }),
    ]);

    expect(body).not.toHaveProperty("estimated_unit_price");
    expect(Object.keys(body).sort()).toEqual(["quantity", "stock_item_id"].sort());
  });

  it("miktar ondalık STRING olarak gider (TR virgülü noktaya çevrilir)", () => {
    const [body] = buildPurchaseRequestLines([
      line({ stockItemId: "s-1", quantity: "2,5", unitPrice: "10" }),
    ]);

    expect(body.quantity).toBe("2.5");
  });
});

describe("buildPurchaseRequestCreateBody — gövde anahtar kümesi", () => {
  it("yalnız DOLU alanların anahtarı kurulur; pending yüzeyler HİÇBİR anahtar eklemez", () => {
    const body = buildPurchaseRequestCreateBody(filledValues());

    // Tedarikçi seçimi · ödeme vadesi · e-posta · ekler burada YOKTUR ve
    // form durumunda karşılıkları olmadığı için sızmaları imkânsızdır.
    expect(Object.keys(body).sort()).toEqual(
      ["lines", "priority", "project_id", "request_date"].sort(),
    );
  });

  it("isteğe bağlı alanlar dolduğunda tam küme gider (`request_no` ASLA)", () => {
    const body = buildPurchaseRequestCreateBody(
      filledValues({
        siteId: "st-1",
        sectionId: "sc-1",
        neededBy: "2026-08-20",
        justification: "  Kat 9 kolon demiri  ",
        quoteDeadline: "2026-08-16",
      }),
    );

    expect(Object.keys(body).sort()).toEqual(
      [
        "lines",
        "needed_by",
        "priority",
        "project_id",
        "quote_deadline",
        "request_date",
        "section_id",
        "site_id",
        "justification",
      ].sort(),
    );
    expect(body).not.toHaveProperty("request_no");
    expect(body.justification).toBe("Kat 9 kolon demiri");
  });
});

describe("buildPurchaseRequestUpdateBody — `lines` TAM DEĞİŞTİRMEDİR", () => {
  it("dizi HER ZAMAN eksiksiz gider (kısmi gönderim diğer kalemleri silerdi)", () => {
    const values = filledValues({
      lines: [
        line({ key: "a", stockItemId: "s-1", quantity: "1", unitPrice: "10" }),
        line({ key: "b", stockItemId: "s-2", quantity: "2", unitPrice: "20" }),
        line({ key: "c", source: "free", freeTextName: "Vinç", freeTextUnit: "Gün", quantity: "3" }),
      ],
    });

    const body = buildPurchaseRequestUpdateBody(values);

    expect(body.lines).toHaveLength(3);
  });

  it("gövde anahtar kümesi TAMdır ve boş alanlar AÇIKÇA null gider", () => {
    // PATCH'te anahtarı atlamak "dokunma" demektir; kullanıcı alanı gerçekten
    // temizlemişse bu veri yalanı olurdu (F-PT2 kararı 5).
    const body = buildPurchaseRequestUpdateBody(filledValues());

    expect(Object.keys(body).sort()).toEqual(
      [
        "justification",
        "lines",
        "needed_by",
        "priority",
        "project_id",
        "quote_deadline",
        "request_date",
        "section_id",
        "site_id",
      ].sort(),
    );
    expect(body.site_id).toBeNull();
    expect(body.section_id).toBeNull();
    expect(body.needed_by).toBeNull();
    expect(body.justification).toBeNull();
    expect(body.quote_deadline).toBeNull();
    expect(body).not.toHaveProperty("request_no");
    expect(body).not.toHaveProperty("status");
  });
});
