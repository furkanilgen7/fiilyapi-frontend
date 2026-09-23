import { describe, expect, it } from "vitest";
import { PRESETS, PRESET_DESCRIPTIONS, matchPreset, presetToUpdate } from "./permission-presets";

describe("permission-presets", () => {
  it("9 preset tanimlar", () => {
    expect(PRESETS).toHaveLength(9);
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
    expect(matchPreset("draft", "all")?.key).toBe("draft");
    expect(matchPreset("none", "all")?.key).toBe("none");
  });

  it("presete uymayan kombinasyon null doner (Ozel)", () => {
    expect(matchPreset("full", "project")).toBeNull();
    expect(matchPreset("admin", "own")).toBeNull();
  });

  // 🔴 2026-09-19 (kullanici karari) — DUSEN kapsamlar preset SUNMAZ.
  //    Backend bunlari `DROPPED_SCOPES` ile reddediyor; UI bir dugme sunsaydi
  //    kullanici 423 alirdi. `draft` de `project` -> `all` tasindi.
  it("dusen kapsamlar (own/project/stock) preset OLARAK SUNULMAZ", () => {
    const kapsamlar = PRESETS.map((p) => p.scope);
    expect(kapsamlar).not.toContain("own");
    expect(kapsamlar).not.toContain("project");
    expect(kapsamlar).not.toContain("stock");
  });

  it("POZITIF KONTROL — uygulanan kapsamlar preset olarak DURUYOR", () => {
    const kapsamlar = new Set(PRESETS.map((p) => p.scope));
    expect(kapsamlar).toContain("all");
    expect(kapsamlar).toContain("limited");
    expect(kapsamlar).toContain("finance");
  });

  it("presetToUpdate dogru (level, scope) uretir", () => {
    expect(presetToUpdate("draft")).toEqual({ access_level: "draft", scope: "all" });
    expect(presetToUpdate("finance")).toEqual({ access_level: "view", scope: "finance" });
    expect(presetToUpdate("super")).toEqual({ access_level: "admin", scope: "all" });
  });

  it("her preset icin bos olmayan aciklama vardir", () => {
    for (const preset of PRESETS) {
      expect(PRESET_DESCRIPTIONS[preset.key]).toBeTruthy();
    }
  });
});
