import { describe, expect, it, vi } from "vitest";

import { INVALID_ALLOCATION_MESSAGE, saveAllocationIfDirty } from "./before-save";

// PLN-F2.3.1 · S1 — çekirdek kaydından ÖNCE dağıtım (tek düğme, yarım kayıt yok).
function input(overrides: Partial<Parameters<typeof saveAllocationIfDirty>[0]> = {}) {
  return {
    canEdit: true,
    isDirty: true,
    invalidCount: 0,
    buildBody: () => ({ codes: [], cells: [], unallocated_reason: null }),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("saveAllocationIfDirty", () => {
  it("kirli taslak TAM gövdeyle kaydedilir, sonra çözülür", async () => {
    const args = input();
    await expect(saveAllocationIfDirty(args)).resolves.toBeUndefined();
    expect(args.save).toHaveBeenCalledWith({ codes: [], cells: [], unallocated_reason: null });
  });

  it("kirli değilse ya da düzenleme yetkisi yoksa istek ATILMAZ, hemen çözülür", async () => {
    const clean = input({ isDirty: false });
    await expect(saveAllocationIfDirty(clean)).resolves.toBeUndefined();
    expect(clean.save).not.toHaveBeenCalled();
    const readOnly = input({ canEdit: false });
    await saveAllocationIfDirty(readOnly);
    expect(readOnly.save).not.toHaveBeenCalled();
  });

  it("dağıtım 409/422 → REDDEDER (çekirdek kendi kaydını yapmaz), hata aynen yüzer", async () => {
    const conflict = Object.assign(new Error("409"), { status: 409 });
    const args = input({ save: vi.fn().mockRejectedValue(conflict) });
    await expect(saveAllocationIfDirty(args)).rejects.toBe(conflict);
  });

  it("geçersiz hücre varsa istek atmadan reddeder", async () => {
    const args = input({ invalidCount: 2 });
    await expect(saveAllocationIfDirty(args)).rejects.toThrow(INVALID_ALLOCATION_MESSAGE);
    expect(args.save).not.toHaveBeenCalled();
  });
});
