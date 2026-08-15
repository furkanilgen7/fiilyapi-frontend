import { describe, it, expect } from "vitest";

import { nextFanOutWindow, SITE_FAN_OUT_CONCURRENCY } from "./useSiteFanOutOptions";

// Hook'un ağ davranışı `WarehouseModal.test.tsx`te (çağıran taraf) doğrulanır;
// burada SINIRLI EŞZAMANLILIĞIN saf çekirdeği sınanır.
describe("nextFanOutWindow — kayar pencere", () => {
  it("ilk turda en çok eşzamanlılık sınırı kadar istek uçar", () => {
    expect(nextFanOutWindow(0, 40, SITE_FAN_OUT_CONCURRENCY)).toBe(SITE_FAN_OUT_CONCURRENCY);
  });

  it("bir istek sonuçlandıkça pencere BİRER kayar", () => {
    expect(nextFanOutWindow(1, 40, 4)).toBe(5);
    expect(nextFanOutWindow(2, 40, 5)).toBe(6);
  });

  it("proje sayısını AŞMAZ", () => {
    expect(nextFanOutWindow(3, 5, 4)).toBe(5);
    expect(nextFanOutWindow(5, 5, 5)).toBe(5);
  });

  it("🔴 pencere KÜÇÜLMEZ — küçülmek uçan bir isteği iptal ederdi", () => {
    expect(nextFanOutWindow(0, 40, 12)).toBe(12);
  });

  it("proje yoksa pencere sıfırdır", () => {
    expect(nextFanOutWindow(0, 0, 0)).toBe(0);
  });
});
