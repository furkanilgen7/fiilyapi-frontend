import { describe, expect, it } from "vitest";
import { BackendError, isForbidden, unwrap } from "./unwrap";

describe("unwrap", () => {
  it("2xx'te data doner", () => {
    const data = unwrap({ data: { id: "1" }, response: new Response(null, { status: 200 }) });
    expect(data).toEqual({ id: "1" });
  });

  it("hata durumunda BackendError firlatir (status + body)", () => {
    try {
      unwrap({ error: { detail: "yok" }, response: new Response(null, { status: 403 }) });
      throw new Error("firlatmaliydi");
    } catch (err) {
      expect(err).toBeInstanceOf(BackendError);
      expect((err as BackendError).status).toBe(403);
      expect((err as BackendError).body).toEqual({ detail: "yok" });
    }
  });

  it("isForbidden yalniz 403 BackendError icin true", () => {
    expect(isForbidden(new BackendError(403, null))).toBe(true);
    expect(isForbidden(new BackendError(500, null))).toBe(false);
    expect(isForbidden(new Error("x"))).toBe(false);
  });
});
