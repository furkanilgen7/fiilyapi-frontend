import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { ACCESS_COOKIE } from "@/lib/auth/constants";

function logoutReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { origin: "http://localhost:3000", host: "localhost:3000", ...headers },
  });
}

describe("POST /api/auth/logout", () => {
  it("cookie'leri siler ve 204 doner", async () => {
    const res = await POST(logoutReq());
    expect(res.status).toBe(204);
    const cleared = res.cookies.get(ACCESS_COOKIE);
    expect(cleared?.value).toBe("");
    expect(cleared?.maxAge).toBe(0);
  });
  it("kotu origin'de 403", async () => {
    const res = await POST(logoutReq({ origin: "http://evil.com" }));
    expect(res.status).toBe(403);
  });
});
