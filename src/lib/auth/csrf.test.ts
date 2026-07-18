import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertSameOrigin } from "./csrf";

function req(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", { method: "POST", headers });
}

describe("assertSameOrigin", () => {
  it("origin host, host ile eslesirse true", () => {
    expect(assertSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  it("origin farkli host ise false", () => {
    expect(assertSameOrigin(req({ origin: "http://evil.com", host: "localhost:3000" }))).toBe(false);
  });
  it("origin yoksa false", () => {
    expect(assertSameOrigin(req({ host: "localhost:3000" }))).toBe(false);
  });
});
