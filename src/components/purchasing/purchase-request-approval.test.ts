import { describe, expect, it } from "vitest";

import {
  bossApprovalStepLabel,
  estimatePurchaseApproval,
  purchaseApprovalMessage,
  purchaseApprovalThresholdLabel,
  purchaseTotalIncompleteNote,
} from "./purchase-request-approval";
import {
  createPurchaseRequestLine,
  type PurchaseRequestLineValues,
} from "./purchase-request-form-state";

function line(
  patch: Partial<PurchaseRequestLineValues>,
): PurchaseRequestLineValues {
  return { ...createPurchaseRequestLine(0), ...patch };
}

/**
 * Fikstür eşiği — ÜRÜN KODUNDAN DEĞİL testten gelir. Eşik artık sunucu
 * ayarıdır (`GET /approvals/settings`); testin onu sabitlemesi, üretim
 * kodunun sabitlemesiyle AYNI ŞEY DEĞİLDİR.
 */
const THRESHOLD = "500000.00";

describe("onay eşiği metni TEK KAYNAKTAN türer (spec K6)", () => {
  it("rozet etiketi (FST 165) eşik sabitinden üretilir — metin hardcode DEĞİLDİR", () => {
    // Arrange · Act
    const label = bossApprovalStepLabel(THRESHOLD);

    // Assert: etiket, eşiğin kendi biçimlendirmesini İÇERİR. İki yerde
    // "500K" yazsaydı bu iddia yine geçerdi; asıl kanıt bir sonraki testtir.
    expect(label).toBe(
      `Patron (${purchaseApprovalThresholdLabel(THRESHOLD)}+)`,
    );
    expect(purchaseApprovalThresholdLabel(THRESHOLD)).toBe(
      `₺${Number(THRESHOLD) / 1000}K`,
    );
  });

  it("sonuç cümlesi (FST 166) ile rozet AYNI eşik gösterimini kullanır", () => {
    // Arrange: eşiği AŞAN tek kalem.
    const lines = [line({ quantity: "1", unitPrice: THRESHOLD })];

    // Act
    const message = purchaseApprovalMessage(
      estimatePurchaseApproval(lines, THRESHOLD),
    );

    // Assert: iki yüzey de aynı dizeyi taşır → kaynak tektir.
    expect(message).toContain(purchaseApprovalThresholdLabel(THRESHOLD));
    expect(bossApprovalStepLabel(THRESHOLD)).toContain(
      purchaseApprovalThresholdLabel(THRESHOLD),
    );
  });
});

describe("estimatePurchaseApproval — eşik hükmü", () => {
  it("eşiğin ALTINDA patron onayı gerekmez (FST 166 örneği: ₺340.900)", () => {
    // Arrange: 15 × 21500 + 200 × 92 = 340.900 (mockup 88/97/112).
    const lines = [
      line({ quantity: "15", unitPrice: "21500" }),
      line({ quantity: "200", unitPrice: "92" }),
    ];

    // Act
    const estimate = estimatePurchaseApproval(lines, THRESHOLD);

    // Assert
    expect(estimate.knownTotal).toBe("340900");
    expect(estimate.outcome).toBe("not_required");
    expect(purchaseApprovalMessage(estimate)).toContain(
      "Patron onayı gerekmiyor",
    );
  });

  it("eşiğe EŞİT tutar da patron onayı gerektirir (sınır dahildir)", () => {
    const estimate = estimatePurchaseApproval(
      [line({ quantity: "1", unitPrice: THRESHOLD })],
      THRESHOLD,
    );

    expect(estimate.outcome).toBe("required");
    expect(purchaseApprovalMessage(estimate)).toContain("Patron onayı gerekli");
  });

  it("kuruşlu tutarlar float yuvarlamasıyla bozulmaz (BigInt toplama)", () => {
    const estimate = estimatePurchaseApproval(
      [
        line({ quantity: "0.1", unitPrice: "3" }),
        line({ quantity: "0.2", unitPrice: "3" }),
      ],
      THRESHOLD,
    );

    expect(estimate.knownTotal).toBe("0.9");
  });
});

describe("🔴 NULL-EŞİK KANONU (WORKFLOW §4) — fail-closed", () => {
  it("fiyatsız kalem varsa toplam BİLİNMEZDİR ve BÜYÜK sayılır: “gerekmiyor” YAZILMAZ", () => {
    // Arrange: ₺18.400'lük bilinen kalem + fiyatı GİRİLMEMİŞ ikinci kalem.
    // Sessizce 0 sayılsaydı toplam eşiğin altında kalır ve ekran "Patron onayı
    // gerekmiyor" derdi — SA backend'inde fiilen istismar edilen yol budur.
    const lines = [
      line({ quantity: "200", unitPrice: "92" }),
      line({ quantity: "1000", unitPrice: "" }),
    ];

    // Act
    const estimate = estimatePurchaseApproval(lines, THRESHOLD);
    const message = purchaseApprovalMessage(estimate);

    // Assert
    expect(estimate.outcome).toBe("unknown");
    expect(estimate.unknownLineCount).toBe(1);
    expect(estimate.unpricedLineCount).toBe(1);
    expect(message).toContain("Patron onayı gerekebilir");
    expect(message).not.toContain("gerekmiyor");
  });

  it("miktarı girilmemiş kalem de tutarı bilinmez yapar (aynı fail-closed dal)", () => {
    const estimate = estimatePurchaseApproval(
      [line({ quantity: "", unitPrice: "21500" })],
      THRESHOLD,
    );

    expect(estimate.outcome).toBe("unknown");
    expect(estimate.unknownLineCount).toBe(1);
    // Fiyat GİRİLMİŞTİR — sunucunun engel ölçüsü (`estimated_unit_price`) ayrı sayılır.
    expect(estimate.unpricedLineCount).toBe(0);
  });

  it("bilinmeyen kalemin tutarı toplama GİRMEZ ve eksiklik GÖRÜNÜR işaretlenir", () => {
    const estimate = estimatePurchaseApproval(
      [
        line({ quantity: "200", unitPrice: "92" }),
        line({ quantity: "1000", unitPrice: "" }),
      ],
      THRESHOLD,
    );

    expect(estimate.knownTotal).toBe("18400");
    expect(purchaseTotalIncompleteNote(estimate)).toContain("EKSİKTİR");
  });

  it("eksiklik yoksa toplam uyarısı BASILMAZ", () => {
    const estimate = estimatePurchaseApproval(
      [line({ quantity: "2", unitPrice: "10" })],
      THRESHOLD,
    );

    expect(purchaseTotalIncompleteNote(estimate)).toBeNull();
  });

  it("hiç kalem yokken toplam sıfırdır ve onay gerekmez", () => {
    const estimate = estimatePurchaseApproval([], THRESHOLD);

    expect(estimate.knownTotal).toBe("0");
    expect(estimate.outcome).toBe("not_required");
  });
});

/*
 * 🔴 KÖR BEKÇİ · EŞİK SABİT DEĞİL, SUNUCU AYARIDIR.
 *
 * Sunucuda eşik `company.approval_threshold_try` kolonundadır ve
 * `PUT /approvals/settings` ile DEĞİŞTİRİLİR; hükmü `transitions.py`
 * (`_assert_approver_level`) o değerle verir. Ekranın sabit 500000 taşıması
 * yönetici eşiği düşürdüğünde formun "Patron onayı gerekmiyor" demesine ve
 * gönderim sonrası onayın REDDEDİLMESİNE yol açardı — üstelik aynı ürünün
 * `/onaylar` şeridi (sunucudan okuyan) ters sayıyı gösterirdi.
 *
 * Eski bekçiler (`source.test.ts` "eşik sabiti tanımlı", bu dosyadaki
 * `PURCHASE_APPROVAL_THRESHOLD` iddiaları) SABİTİ kilitliyordu, yani doğru
 * düzeltmenin ÖNÜNE bariyer kuruyordu.
 */
describe("🔴 eşik SUNUCUDAN gelir — aynı kalem kümesi eşiğe göre hüküm değiştirir", () => {
  const lines = [line({ quantity: "1", unitPrice: "340900" })];

  it("eşik ₺200.000 iken AYNI talep patron onayı GEREKTİRİR", () => {
    expect(estimatePurchaseApproval(lines, "200000.00").outcome).toBe(
      "required",
    );
  });

  it("eşik ₺600.000 iken AYNI talep patron onayı GEREKTİRMEZ", () => {
    expect(estimatePurchaseApproval(lines, "600000.00").outcome).toBe(
      "not_required",
    );
  });

  it("eşik henüz YÜKLENMEDİYSE hüküm KURULMAZ (sahte sayı basılmaz)", () => {
    const estimate = estimatePurchaseApproval(lines, undefined);

    expect(estimate.outcome).toBe("threshold_unknown");
    expect(purchaseApprovalMessage(estimate)).toBeNull();
    expect(bossApprovalStepLabel(undefined)).toBe("Patron");
  });

  it("eşik etiketi SUNUCU değerinden türer", () => {
    expect(purchaseApprovalThresholdLabel("200000.00")).toBe("₺200K");
    expect(bossApprovalStepLabel("200000.00")).toBe("Patron (₺200K+)");
  });
});
