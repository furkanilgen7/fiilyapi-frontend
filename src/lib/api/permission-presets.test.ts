import { describe, expect, it } from "vitest";
import { PRESETS, matchPreset, presetToUpdate } from "./permission-presets";

describe("permission-presets", () => {
  it("12 preset tanimlar", () => {
    expect(PRESETS).toHaveLength(12);
  });

  it("her preset kendi (level, scope) ile eslesir", () => {
    for (const preset of PRESETS) {
      expect(matchPreset(preset.access_level, preset.scope)?.key).toBe(preset.key);
    }
  });

  it("bilinen kombinasyonlari dogru eslestirir", () => {
    expect(matchPreset("admin", "all")?.key).toBe("super");
    expect(matchPreset("view", "all")?.key).toBe("view");
    expect(matchPreset("view", "limited")?.key).toBe("limited");
    expect(matchPreset("draft", "project")?.key).toBe("draft");
    expect(matchPreset("none", "all")?.key).toBe("none");
  });

  it("presete uymayan kombinasyon null doner (Ozel)", () => {
    expect(matchPreset("full", "project")).toBeNull();
    expect(matchPreset("admin", "own")).toBeNull();
  });

  it("presetToUpdate dogru (level, scope) uretir", () => {
    expect(presetToUpdate("draft")).toEqual({ access_level: "draft", scope: "project" });
    expect(presetToUpdate("finance")).toEqual({ access_level: "view", scope: "finance" });
    expect(presetToUpdate("super")).toEqual({ access_level: "admin", scope: "all" });
  });
});
