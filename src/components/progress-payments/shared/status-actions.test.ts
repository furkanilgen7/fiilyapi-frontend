import { describe, expect, it } from "vitest";

import { permittedPaymentActions } from "./status-actions";

describe("permittedPaymentActions", () => {
  it("draft — ≥draft seviyesinde yalniz submit", () => {
    expect(permittedPaymentActions("draft", "draft")).toEqual(["submit"]);
    expect(permittedPaymentActions("draft", "full")).toEqual(["submit"]);
  });
  it("draft — view seviyesinde bos", () => {
    expect(permittedPaymentActions("draft", "view")).toEqual([]);
  });
  it("pending_approval — ≥approve seviyesinde reject+approve", () => {
    expect(permittedPaymentActions("pending_approval", "approve")).toEqual(["reject", "approve"]);
  });
  it("pending_approval — draft seviyesinde bos (yetersiz)", () => {
    expect(permittedPaymentActions("pending_approval", "draft")).toEqual([]);
  });
  it("approved — admin seviyesinde unapprove+markPaid", () => {
    expect(permittedPaymentActions("approved", "admin")).toEqual(["unapprove", "markPaid"]);
  });
  it("approved — yalniz approve seviyesinde markPaid (unapprove yok)", () => {
    expect(permittedPaymentActions("approved", "approve")).toEqual(["markPaid"]);
  });
  it("approved — draft seviyesinde bos", () => {
    expect(permittedPaymentActions("approved", "draft")).toEqual([]);
  });
  it("paid — her seviyede bos", () => {
    expect(permittedPaymentActions("paid", "admin")).toEqual([]);
  });
  it("seviye undefined ise bilinmezlik = izin var (spec §2.5.3) — draft'ta submit gorunur", () => {
    expect(permittedPaymentActions("draft", undefined)).toEqual(["submit"]);
  });
});
