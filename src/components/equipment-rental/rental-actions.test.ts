import { describe, it, expect } from "vitest";

import type { AccessLevel } from "@/lib/auth/permissions";
import {
  RENTAL_ACTION_LABEL,
  RENTAL_FORWARD_ACTION_LABEL,
  isRentalEditable,
  permittedRentalActions,
  rentalForwardActionLabel,
} from "./rental-actions";
import type { RentalInvoiceStatus } from "@/lib/api/hooks/useEquipmentRentalInvoices";

const ALL_STATUSES: readonly RentalInvoiceStatus[] = [
  "draft",
  "pending_verification",
  "approved",
  "paid",
];

/**
 * 🔴 EMSALDEN SAPMA — `progress-payments/shared/status-actions.ts` `approve`/
 * `admin` esiklerini kullanir; KIRADA HEPSI `full`tur
 * (`rental_router.py:54-55`: `_FULL = require_permission(…, AccessLevel.full)`
 * ve tum yazma uclari `dependencies=[_FULL]`). Emsal kopyalansaydi `approve`
 * seviyeli kullanici 403 veren dugmeleri gorurdu.
 */
describe("permittedRentalActions · durum tablosunun birebir yansimasi", () => {
  it("draft: yalniz ileri adim (approve); pay/reject YOK", () => {
    expect(permittedRentalActions("draft", "full")).toEqual(["approve"]);
  });

  it("pending_verification: yalniz ileri adim (approve); pay/reject YOK", () => {
    expect(permittedRentalActions("pending_verification", "full")).toEqual(["approve"]);
  });

  it("approved: reject + pay (approve YOK — odeme kendi ucundadir)", () => {
    expect(permittedRentalActions("approved", "full")).toEqual(["reject", "pay"]);
  });

  it("paid: UC DURUM — hicbir aksiyon yok", () => {
    expect(permittedRentalActions("paid", "full")).toEqual([]);
  });

  it.each(ALL_STATUSES)("%s durumunda `view` seviyesi HIC aksiyon vermez", (status) => {
    expect(permittedRentalActions(status, "view")).toEqual([]);
  });

  /* 🔴 SAPMA BEKCISI: emsal esik (`approve`) kopyalanirsa bu blok kirmizi olur. */
  it.each(ALL_STATUSES)("%s durumunda `approve` seviyesi HIC aksiyon vermez (esik `full`)", (status) => {
    expect(permittedRentalActions(status, "approve")).toEqual([]);
  });

  it.each(ALL_STATUSES)("%s durumunda `draft` seviyesi HIC aksiyon vermez", (status) => {
    expect(permittedRentalActions(status, "draft")).toEqual([]);
  });

  it("`admin` seviyesi `full`un ustundedir — aksiyonlari gorur", () => {
    expect(permittedRentalActions("approved", "admin")).toEqual(["reject", "pay"]);
  });

  it("seviye BILINMIYORSA gizleme yapilmaz (permissions.ts bilinmezlik kurali)", () => {
    expect(permittedRentalActions("draft", undefined)).toEqual(["approve"]);
  });

  it("`none` seviyesi HIC aksiyon vermez", () => {
    expect(permittedRentalActions("draft", "none" satisfies AccessLevel)).toEqual([]);
  });
});

describe("rentalForwardActionLabel · ileri adim etiketi", () => {
  it("draft → hedef durumun mockup adindan turer (M5:65 `Doğrulama Bekliyor`)", () => {
    expect(rentalForwardActionLabel("draft")).toBe("Doğrulamaya Gönder");
  });

  it("pending_verification → backend docstring'inin KALIN etiketi", () => {
    // rental_router.py:210 + rental_service.py:640 + openapi description.
    expect(rentalForwardActionLabel("pending_verification")).toBe("Onayla ve Ödemeye Gönder");
  });

  it("approved/paid → ileri adim YOK (odeme kendi ucunda, paid uc durum)", () => {
    expect(rentalForwardActionLabel("approved")).toBeNull();
    expect(rentalForwardActionLabel("paid")).toBeNull();
  });

  it("harita dort durumu da tasir — kume KENDISI sinanir", () => {
    expect(Object.keys(RENTAL_FORWARD_ACTION_LABEL).sort()).toEqual([...ALL_STATUSES].sort());
  });

  it("ileri adim etiketi olan her durum `approve` aksiyonunu da verir (tutarlilik)", () => {
    for (const status of ALL_STATUSES) {
      const hasLabel = rentalForwardActionLabel(status) !== null;
      const hasAction = permittedRentalActions(status, "full").includes("approve");
      expect(hasAction, `${status}: etiket=${hasLabel} aksiyon=${hasAction}`).toBe(hasLabel);
    }
  });
});

describe("RENTAL_ACTION_LABEL · servis mesajlarindan turetilen etiketler", () => {
  it("uc aksiyonun HEPSI haritada", () => {
    expect(Object.keys(RENTAL_ACTION_LABEL).sort()).toEqual(["approve", "pay", "reject"]);
  });

  it("pay/reject etiketleri servis mesajlariyla ayni dili konusur", () => {
    expect(RENTAL_ACTION_LABEL.pay).toBe("Ödendi İşaretle");
    expect(RENTAL_ACTION_LABEL.reject).toBe("Onayı Geri Al");
  });
});

describe("isRentalEditable · EDIT_LOCKED_STATUSES yansimasi", () => {
  it("draft ve pending_verification duzenlenebilir", () => {
    expect(isRentalEditable("draft")).toBe(true);
    expect(isRentalEditable("pending_verification")).toBe(true);
  });

  it("approved ve paid KILITLI (rental_transitions.py EDIT_LOCKED_STATUSES)", () => {
    expect(isRentalEditable("approved")).toBe(false);
    expect(isRentalEditable("paid")).toBe(false);
  });

  it("kilitli her durumda satir/baslik duzenleme aksiyonu da olmaz", () => {
    for (const status of ALL_STATUSES) {
      if (isRentalEditable(status)) continue;
      expect(permittedRentalActions(status, "full")).not.toContain("approve");
    }
  });
});
