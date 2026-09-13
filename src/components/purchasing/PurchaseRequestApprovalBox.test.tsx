import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { PurchaseRequestApprovalBox } from "./PurchaseRequestApprovalBox";
import {
  createPurchaseRequestLine,
  type PurchaseRequestLineValues,
} from "./purchase-request-form-state";
import { useApprovalSettings } from "@/lib/api/hooks/useApprovals";

/*
 * 🔴 KÖR BEKÇİ · KUTU EŞİĞİ SUNUCUDAN OKUR.
 *
 * Eşik `GET /approvals/settings`ten gelir (aynı ürünün `/onaylar` şeridi ve
 * Ayarlar > Onay Rolleri ekranı ZATEN oradan okur). Kutu sabit 500000
 * taşıdığında yönetici eşiği düşürünce form "gerekmiyor" der, sunucu ise
 * onayı reddeder — iki ekran aynı sayı hakkında çelişirdi.
 */
vi.mock("@/lib/api/hooks/useApprovals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useApprovals")>()),
  useApprovalSettings: vi.fn(),
}));

const mockSettings = vi.mocked(useApprovalSettings);

function settingsStub(threshold: string | undefined) {
  return {
    data:
      threshold === undefined
        ? undefined
        : { approval_threshold_try: threshold },
  } as unknown as ReturnType<typeof useApprovalSettings>;
}

/** ₺340.900'lük TAM fiyatlı tek kalem (FST 166 örneği). */
const LINES: PurchaseRequestLineValues[] = [
  {
    ...createPurchaseRequestLine(0),
    source: "stock",
    stockItemId: "s-1",
    quantity: "1",
    unitPrice: "340900",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PurchaseRequestApprovalBox · eşik SUNUCU ayarından okunur", () => {
  it("🔴 eşik ₺200.000'e çekildiğinde kutu 'Patron onayı gerekli' der", () => {
    mockSettings.mockReturnValue(settingsStub("200000.00"));

    render(<PurchaseRequestApprovalBox lines={LINES} />);

    expect(screen.getByTestId("talep-onay-sonuc").textContent).toContain(
      "Patron onayı gerekli",
    );
    expect(screen.getByTestId("talep-patron-adimi").textContent).toContain(
      "₺200K",
    );
  });

  // POZİTİF/NEGATİF KONTROL — kapı her şeye "gerekli" demiyor.
  it("eşik ₺600.000 iken AYNI talepte patron onayı gerekmez", () => {
    mockSettings.mockReturnValue(settingsStub("600000.00"));

    render(<PurchaseRequestApprovalBox lines={LINES} />);

    expect(screen.getByTestId("talep-onay-sonuc").textContent).toContain(
      "Patron onayı gerekmiyor",
    );
    expect(screen.getByTestId("talep-patron-adimi").textContent).toContain(
      "₺600K",
    );
  });

  it("ayar YÜKLENMEDİYSE hüküm cümlesi HİÇ basılmaz, sahte eşik gösterilmez", () => {
    mockSettings.mockReturnValue(settingsStub(undefined));

    render(<PurchaseRequestApprovalBox lines={LINES} />);

    expect(screen.queryByTestId("talep-onay-sonuc")).toBeNull();
    expect(screen.getByTestId("talep-patron-adimi").textContent).toBe("Patron");
  });
});
