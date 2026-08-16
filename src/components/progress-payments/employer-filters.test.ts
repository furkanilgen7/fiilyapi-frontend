import { describe, expect, it } from "vitest";

import { parseEmployerFilters } from "./employer-filters";

describe("parseEmployerFilters", () => {
  it("project_id parametresini okur", () => {
    expect(parseEmployerFilters(new URLSearchParams("project_id=p-1"))).toEqual({
      projectId: "p-1",
    });
  });

  it("parametre yokken null doner (varsayilan: tum projeler)", () => {
    expect(parseEmployerFilters(new URLSearchParams())).toEqual({ projectId: null });
  });

  it("bos project_id degeri null sayilir", () => {
    expect(parseEmployerFilters(new URLSearchParams("project_id=")).projectId).toBeNull();
  });

  it("ilgisiz parametreler yok sayilir", () => {
    expect(parseEmployerFilters(new URLSearchParams("tab=ozet&status=paid")).projectId).toBeNull();
  });
});
