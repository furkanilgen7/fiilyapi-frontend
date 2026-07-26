import { describe, it, expect } from "vitest";

import { pendingModuleLabel } from "./pending-modules";

describe("pendingModuleLabel", () => {
  it("F6 anahtarlarini esler", () => {
    expect(pendingModuleLabel("progress_payments")).toBe("Hakediş modülüyle birlikte gelir");
    expect(pendingModuleLabel("invoicing")).toBe("Fatura yönetimiyle birlikte gelir");
    expect(pendingModuleLabel("approvals")).toBe("Onay kutusuyla birlikte gelir");
    expect(pendingModuleLabel("inventory")).toBe("Stok ve saha modülleriyle birlikte gelir");
  });

  it("P1 anahtarlarini esler", () => {
    expect(pendingModuleLabel("timesheet")).toBe("Puantaj modülüyle birlikte gelir");
    expect(pendingModuleLabel("subcontracts")).toBe("Taşeron sözleşmeleriyle birlikte gelir");
    expect(pendingModuleLabel("units")).toBe("Ünite satış modülüyle birlikte gelir");
    expect(pendingModuleLabel("project_costs")).toBe("Maliyet takibiyle birlikte gelir");
  });

  it("bilinmeyen anahtarda genel metin doner", () => {
    expect(pendingModuleLabel("bilinmeyen")).toBe("İlgili modülle birlikte gelir");
  });
});
