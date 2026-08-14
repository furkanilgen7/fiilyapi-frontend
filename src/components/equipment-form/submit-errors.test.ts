import { describe, expect, it } from "vitest";

import { BackendError } from "@/lib/api/unwrap";

import {
  equipmentSubmitErrorMessage,
  INVALID_EQUIPMENT_FALLBACK,
  SAVE_EQUIPMENT_FALLBACK,
} from "./submit-errors";

describe("equipmentSubmitErrorMessage", () => {
  it("422'de sunucunun Türkçe detayını YUTMAZ ve “Geçersiz bilgi” etiketi ekler", () => {
    const error = new BackendError(422, {
      detail: "Kendi malımız ekipmanda alış bedeli zorunludur.",
    });
    const message = equipmentSubmitErrorMessage(error);
    expect(message).toContain("Geçersiz bilgi");
    expect(message).toContain("alış bedeli zorunludur");
  });

  it("422'de sunucu detay yazmadıysa kendi metnine düşer", () => {
    expect(equipmentSubmitErrorMessage(new BackendError(422, {}))).toContain(
      INVALID_EQUIPMENT_FALLBACK,
    );
  });

  it("diğer hatalar ayrı metne düşer (422 ile tek metne İNDİRİLMEZ)", () => {
    const message = equipmentSubmitErrorMessage(new Error("ağ koptu"));
    expect(message).not.toContain("Geçersiz bilgi");
    expect(message.length).toBeGreaterThan(0);
  });

  it("tanınmayan değer sessizce yutulmaz", () => {
    expect(equipmentSubmitErrorMessage(undefined)).toBe(SAVE_EQUIPMENT_FALLBACK);
  });
});
