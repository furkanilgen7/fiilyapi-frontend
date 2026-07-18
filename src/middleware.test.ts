import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { ACCESS_COOKIE } from "@/lib/auth/constants";

function pageReq(path: string, cookies: Record<string, string> = {}): NextRequest {
  const r = new NextRequest(`http://localhost:3000${path}`);
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

describe("middleware", () => {
  it("cookie yoksa /login'e next parametresiyle yonlendirir", () => {
    const res = middleware(pageReq("/"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2F");
  });

  it("access cookie varsa gecise izin verir", () => {
    const res = middleware(pageReq("/", { [ACCESS_COOKIE]: "acc" }));
    // NextResponse.next() → yonlendirme yok (location basligi yok)
    expect(res.headers.get("location")).toBeNull();
  });
});
