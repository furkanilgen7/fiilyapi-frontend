import { describe, expect, it } from "vitest";
import { backendErrorMessage } from "./error-message";
import { BackendError } from "@/lib/api/unwrap";

describe("backendErrorMessage", () => {
  it("string detail dondurur", () => {
    expect(backendErrorMessage(new BackendError(409, { detail: "e-posta kullanimda" }))).toBe("e-posta kullanimda");
  });

  it("validation dizisinden ilk msg'yi dondurur", () => {
    expect(backendErrorMessage(new BackendError(422, { detail: [{ msg: "gecersiz e-posta", loc: ["body", "email"] }] }))).toBe("gecersiz e-posta");
  });

  it("bilinmeyen hatada fallback dondurur", () => {
    expect(backendErrorMessage(new Error("x"))).toBe("Beklenmeyen bir hata oluştu.");
  });
});
