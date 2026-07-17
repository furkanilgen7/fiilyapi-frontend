import { describe, it, expect, expectTypeOf } from "vitest";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

describe("API tip üretimi", () => {
  it("apiClient tanımlıdır ve GET/POST metodları vardır", () => {
    expect(apiClient).toBeDefined();
    expect(typeof apiClient.GET).toBe("function");
    expect(typeof apiClient.POST).toBe("function");
  });

  it("MeResponse şeması beklenen alanları taşır", () => {
    type Me = components["schemas"]["MeResponse"];
    expectTypeOf<Me>().toHaveProperty("email");
    expectTypeOf<Me>().toHaveProperty("role_key");
    expectTypeOf<Me>().toHaveProperty("status");
  });

  it("TokenPair şeması access/refresh token taşır", () => {
    type Tokens = components["schemas"]["TokenPair"];
    expectTypeOf<Tokens>().toHaveProperty("access_token");
    expectTypeOf<Tokens>().toHaveProperty("refresh_token");
  });
});
