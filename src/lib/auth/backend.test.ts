import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backendUrl, proxyAuthenticated } from "./backend";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("backendUrl", () => {
  afterEach(() => {
    delete process.env.BACKEND_URL;
  });
  it("env yoksa hata firlatir", () => {
    delete process.env.BACKEND_URL;
    expect(() => backendUrl()).toThrow();
  });
  it("env varsa deger doner", () => {
    process.env.BACKEND_URL = "http://backend:8000";
    expect(backendUrl()).toBe("http://backend:8000");
  });
});

describe("proxyAuthenticated", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "http://backend:8000";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_URL;
  });

  it("200'de govdeyi geciren", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { full_name: "Ali" })));
    const r = await proxyAuthenticated("acc", "ref", "/auth/me");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ full_name: "Ali" });
    expect(r.refreshedAccessToken).toBeUndefined();
  });

  it("401'de refresh basarili ise yeni access ile retry eder", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expired" })) // ilk /auth/me
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "new-acc", refresh_token: "ref2" })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse(200, { full_name: "Ali" })); // retry /auth/me
    vi.stubGlobal("fetch", fetchMock);
    const r = await proxyAuthenticated("old-acc", "ref", "/auth/me");
    expect(r.status).toBe(200);
    expect(r.refreshedAccessToken).toBe("new-acc");
    // retry cagirisi yeni access token'i kullanir
    const retryCall = fetchMock.mock.calls[2];
    expect(String(retryCall[1].headers.Authorization)).toContain("new-acc");
  });

  it("401 + refresh basarisiz ise 401 doner", async () => {
    vi.stubGlobal("fetch", vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {})));
    const r = await proxyAuthenticated("acc", "ref", "/auth/me");
    expect(r.status).toBe(401);
  });

  it("refresh token yoksa 401'i dogrudan doner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, {})));
    const r = await proxyAuthenticated("acc", undefined, "/auth/me");
    expect(r.status).toBe(401);
  });
});
