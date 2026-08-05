import { describe, it, expect } from "vitest";

import { planGroupManagerText, planGroupTitle, planRowLabel } from "./grid-derive";

describe("planGroupTitle", () => {
  it("ekip grubunda bolum adini basar", () => {
    expect(planGroupTitle("crew", "Kat 6–10 Kaba")).toBe("Kat 6–10 Kaba");
  });

  it("ekipman grubunda SABIT basligi basar (bolum adi null'dur)", () => {
    expect(planGroupTitle("equipment", null)).toBe("Makine & Ekipman");
  });

  it("bolumsuz ekip grubu ekipmanla AYNI basliga dusmez", () => {
    const title = planGroupTitle("crew", null);
    expect(title).toBe("Bölümsüz Ekipler");
    expect(title).not.toBe("Makine & Ekipman");
  });
});

describe("planGroupManagerText", () => {
  it("sorumlu varsa etiketli basar", () => {
    expect(planGroupManagerText("Sercan Öztürk")).toBe("Bölüm sorumlusu: Sercan Öztürk");
  });

  it("sorumlu yoksa hucre BOS kalir", () => {
    expect(planGroupManagerText(null)).toBe("");
  });
});

describe("planRowLabel", () => {
  it("isci sayisi varsa parantezle basar", () => {
    expect(planRowLabel("Kalıpçı", 14)).toBe("Kalıpçı (14)");
  });

  it("isci sayisi null ise parantez BASILMAZ", () => {
    expect(planRowLabel("Tower Crane", null)).toBe("Tower Crane");
  });
});
