import { describe, it, expect } from "vitest";

import {
  buildCustomerCreateBody,
  buildInstallmentsSave,
  buildSaleCreateBody,
} from "./build-body";
import { emptySaleFormValues, type PlanRowValues, type SaleFormValues } from "./form-state";
import { LATE_FEE_MONTHLY_PCT } from "./constants";

function values(overrides: Partial<SaleFormValues> = {}): SaleFormValues {
  return {
    ...emptySaleFormValues(),
    projectId: "p-2",
    unitId: "u-1",
    salePrice: "1440000",
    ...overrides,
  };
}

describe("buildSaleCreateBody — üretilmiş tip + pending sızıntısı", () => {
  it("has_condominium_easement ve has_mortgage DAİMA gövdededir (false olsa bile)", () => {
    const body = buildSaleCreateBody(values(), "cus-1", "sale");
    expect(body).toHaveProperty("has_condominium_easement", false);
    expect(body).toHaveProperty("has_mortgage", false);
  });

  it("işaretliyse iki boolean da true gider", () => {
    const body = buildSaleCreateBody(
      values({ hasCondominiumEasement: true, hasMortgage: true }),
      "cus-1",
      "sale",
    );
    expect(body.has_condominium_easement).toBe(true);
    expect(body.has_mortgage).toBe(true);
  });

  it("belge / otomatik fatura / alıcı-adı anahtarları satış gövdesine SIZMAZ", () => {
    const body = buildSaleCreateBody(values(), "cus-1", "sale");
    for (const forbidden of [
      "documents",
      "files",
      "auto_invoice",
      "name",
      "national_id",
      "tax_number",
      "phone",
      "email",
      "address",
      "customer_mode",
    ]) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }
  });

  it("sale_type çağırandan gelir: Rezervasyon Yap 'reservation', Satışı Kaydet seçici değeri", () => {
    expect(buildSaleCreateBody(values({ saleType: "sale" }), "c", "sale").sale_type).toBe("sale");
    expect(buildSaleCreateBody(values(), "c", "reservation").sale_type).toBe("reservation");
    expect(
      buildSaleCreateBody(values({ saleType: "pre_contract" }), "c", "pre_contract").sale_type,
    ).toBe("pre_contract");
  });

  it("customer_id çağırandan gelir (kayıtlı seçim ya da yeni müşteri POST id'si)", () => {
    expect(buildSaleCreateBody(values(), "cus-existing", "sale").customer_id).toBe("cus-existing");
  });

  it("gecikme faizi işaretliyse late_fee_monthly_pct BİLGİ olarak gövdeye girer; işaretsizse HİÇ girmez", () => {
    const off = buildSaleCreateBody(values(), "c", "sale");
    expect(off).not.toHaveProperty("late_fee_monthly_pct");

    const on = buildSaleCreateBody(values({ lateFeeEnabled: true }), "c", "sale");
    expect(on.late_fee_monthly_pct).toBe(LATE_FEE_MONTHLY_PCT);
    // ⚠️ Plan/bedel alanlarına DOKUNMAZ: gecikme faizi Σ'yı şişirmez (P8; kural
    // sunucuda, gövde yalnız bilgiyi taşır).
    expect(on.sale_price).toBe("1440000");
  });

  it("boş isteğe bağlı alanlar için anahtar HİÇ kurulmaz", () => {
    const body = buildSaleCreateBody(
      values({
        discountAmount: "",
        downPayment: "",
        installmentCount: "",
        firstInstallmentDate: "",
        termInterestPct: "",
        advisorUserId: "",
        plannedDeedDate: "",
        deliveryDate: "",
      }),
      "c",
      "sale",
    );
    for (const key of [
      "discount_amount",
      "down_payment",
      "installment_count",
      "first_installment_date",
      "term_interest_pct",
      "advisor_user_id",
      "planned_deed_date",
      "delivery_date",
    ]) {
      expect(body, key).not.toHaveProperty(key);
    }
  });

  it("dolu isteğe bağlı alanlar normalize edilerek gider (installment_count sayı)", () => {
    const body = buildSaleCreateBody(
      values({ discountAmount: "40000", installmentCount: "12", termInterestPct: "0" }),
      "c",
      "sale",
    );
    expect(body.discount_amount).toBe("40000");
    expect(body.installment_count).toBe(12);
    expect(body.term_interest_pct).toBe("0");
  });
});

describe("buildCustomerCreateBody — TCKN ⇄ VKN ayrımı", () => {
  it("gerçek kişide kimlik national_id'ye yazılır (tax_number YOK)", () => {
    const body = buildCustomerCreateBody(
      values({ buyerType: "person", buyerName: "Serkan Öz", buyerNationalOrTaxId: "12345678901" }),
    );
    expect(body).toMatchObject({ customer_type: "person", name: "Serkan Öz", national_id: "12345678901" });
    expect(body).not.toHaveProperty("tax_number");
  });

  it("tüzel kişide kimlik tax_number'a yazılır (national_id YOK)", () => {
    const body = buildCustomerCreateBody(
      values({ buyerType: "company", buyerName: "Demir A.Ş.", buyerNationalOrTaxId: "1234567890" }),
    );
    expect(body).toMatchObject({ customer_type: "company", name: "Demir A.Ş.", tax_number: "1234567890" });
    expect(body).not.toHaveProperty("national_id");
  });

  it("yalnız ad + tip zorunlu; boş opsiyoneller anahtar açmaz", () => {
    const body = buildCustomerCreateBody(values({ buyerName: "X", buyerNationalOrTaxId: "" }));
    expect(Object.keys(body).sort()).toEqual(["customer_type", "name"]);
  });
});

describe("buildInstallmentsSave — PUT DEĞİŞTİRME gövdesi", () => {
  function row(overrides: Partial<PlanRowValues> = {}): PlanRowValues {
    return {
      key: "plan-1",
      sequenceNo: 1,
      label: "Peşinat",
      dueDate: "2026-09-01",
      amount: "440000",
      paymentMethod: "transfer",
      isDownPayment: true,
      ...overrides,
    };
  }

  it("satırları sequence_no/label/due_date/amount olarak taşır", () => {
    const [item] = buildInstallmentsSave([row()]);
    expect(item).toMatchObject({
      sequence_no: 1,
      label: "Peşinat",
      due_date: "2026-09-01",
      amount: "440000",
      payment_method: "transfer",
    });
  });

  it("ödeme yöntemi boşsa payment_method anahtarı HİÇ girmez", () => {
    const [item] = buildInstallmentsSave([row({ paymentMethod: "" })]);
    expect(item).not.toHaveProperty("payment_method");
  });
});
