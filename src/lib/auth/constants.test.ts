import { describe, expect, it } from "vitest";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";

describe("auth constants", () => {
  it("cookie adlari sabittir", () => {
    expect(ACCESS_COOKIE).toBe("fiil_access");
    expect(REFRESH_COOKIE).toBe("fiil_refresh");
  });
});
