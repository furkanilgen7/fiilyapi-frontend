import { describe, it, expect } from "vitest";

import { BackendError } from "@/lib/api/unwrap";
import {
  DUPLICATE_PERSONNEL_FALLBACK,
  INVALID_PERSONNEL_FALLBACK,
  SAVE_PERSONNEL_FALLBACK,
  isPersonnelDuplicateError,
  personnelSubmitErrorMessage,
} from "./submit-errors";

/**
 * 🔒 spec K3 KAPISI — 422 ile 409 AYNI mesaja İNDİRİLEMEZ.
 *
 * İstemci TCKN checksum hesaplamaz; sunucunun reddini AYRIŞTIRMAK zorundadır:
 * "geçersiz TC" ile "bu TC'li personel zaten var" kullanıcı için iki farklı
 * eylem demektir (alanı düzelt ↔ mevcut kaydı aç).
 */
describe("personnelSubmitErrorMessage — 422 ↔ 409 ayrımı", () => {
  it("422 geçersizlik mesajı üretir", () => {
    const message = personnelSubmitErrorMessage(
      new BackendError(422, { detail: "TC kimlik numarası geçersiz" }),
    );
    expect(message).toContain("Geçersiz bilgi");
    expect(message).toContain("TC kimlik numarası geçersiz");
  });

  it("409 ÇİFT KAYIT mesajı üretir (geçersizlik mesajı DEĞİL)", () => {
    const message = personnelSubmitErrorMessage(
      new BackendError(409, { detail: "Bu TC kimlik no ile personel mevcut" }),
    );
    expect(message).toContain("Çift kayıt");
    expect(message).not.toContain("Geçersiz bilgi");
    expect(message).toContain("Bu TC kimlik no ile personel mevcut");
  });

  it("iki hatanın metni FARKLIDIR — sunucu ikisine de AYNI detail yazsa bile", () => {
    const sameDetail = { detail: "tc_no" };
    const invalid = personnelSubmitErrorMessage(new BackendError(422, sameDetail));
    const duplicate = personnelSubmitErrorMessage(new BackendError(409, sameDetail));
    expect(invalid).not.toBe(duplicate);
  });

  it("sunucu detail yazmadığında da iki düşüş metni FARKLIDIR", () => {
    const invalid = personnelSubmitErrorMessage(new BackendError(422, null));
    const duplicate = personnelSubmitErrorMessage(new BackendError(409, null));
    expect(invalid).toContain(INVALID_PERSONNEL_FALLBACK);
    expect(duplicate).toContain(DUPLICATE_PERSONNEL_FALLBACK);
    expect(invalid).not.toBe(duplicate);
  });

  it("pydantic dizi gövdesinden ilk msg okunur (yutulmaz)", () => {
    const message = personnelSubmitErrorMessage(
      new BackendError(422, { detail: [{ msg: "String should have at most 11 characters" }] }),
    );
    expect(message).toContain("String should have at most 11 characters");
  });

  it("diğer durumlar genel düşüş metnine iner", () => {
    expect(personnelSubmitErrorMessage(new BackendError(500, null))).toBe(
      SAVE_PERSONNEL_FALLBACK,
    );
    expect(personnelSubmitErrorMessage(new Error("ağ hatası"))).toBe(SAVE_PERSONNEL_FALLBACK);
  });
});

describe("isPersonnelDuplicateError", () => {
  it("yalnız 409 için doğrudur", () => {
    expect(isPersonnelDuplicateError(new BackendError(409, null))).toBe(true);
    expect(isPersonnelDuplicateError(new BackendError(422, null))).toBe(false);
    expect(isPersonnelDuplicateError(new Error("x"))).toBe(false);
  });
});
