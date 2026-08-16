import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";
import { pendingModuleLabel } from "@/lib/pending-modules";

import { FinancialStatementsHomeView } from "./FinancialStatementsHomeView";
import {
  INCOME_STATEMENT_EXPORT_REASON,
  INCOME_STATEMENT_PERIOD_REASON,
  INCOME_STATEMENT_REASON,
  PERFORMANCE_SUMMARY_REASON,
  PROJECT_FILTER_REASON,
  PROJECT_PROFITABILITY_REASON,
} from "./income-statement";

vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/mali-tablolar" }));

/**
 * 🔴 F-PRJTAB kanonunun TESTTEKİ karşılığı: gerekçe metinleri kayıttan TÜRER,
 * öğenin yanına SABİTLENMEZ. Kayıt burada MÜHÜRLÜ bir değerle taklit edilir;
 * bir gerekçe ekrana elle yazılırsa bu mühür orada BULUNMAZ ve test kırılır.
 * (Metnin GERÇEĞİNİ ayrı bir describe gerçek uygulamayla sınar.)
 */
vi.mock("@/lib/pending-modules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pending-modules")>()),
  pendingModuleLabel: vi.fn(),
}));

const SEAL = (key: string | null | undefined) => `GEREKÇE[${String(key)}]`;

function setSession(level: string | undefined) {
  vi.mocked(useSession).mockReturnValue({
    me: {
      permissions: level === undefined ? {} : { accounting: level },
    } as unknown as MeResponse,
  } as unknown as ReturnType<typeof useSession>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setSession("full");
  vi.mocked(pendingModuleLabel).mockImplementation(SEAL);
});

describe("E11 · `/mali-tablolar` kök ekranı — başlık şeridi", () => {
  it("E11:62 üst etiketi ve E11:64 başlığı basılır", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.getByTestId("mt-eyebrow")).toHaveTextContent("Sözleşme & Mali");
    expect(
      screen.getByRole("heading", { name: "Mali Tablolar", level: 1 }),
    ).toBeInTheDocument();
  });

  it("ekran YÜKLENDİ damgası vardır (görsel spec'in tutamağı)", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.getByTestId("mt-loaded")).toBeInTheDocument();
  });

  it("🔴 E11:36-58 bu rota drill sidebar ÇİZMEZ (grup layout'u BİLEREK yok)", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.queryByRole("complementary", { name: "Mali tablolar menüsü" })).toBeNull();
  });
});

describe("E11:66-70 segment denetimi", () => {
  it("`Bilanço` ve `Nakit Akışı` GERÇEK bağlantılardır", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.getByTestId("mt-seg-bilanco")).toHaveAttribute(
      "href",
      "/mali-tablolar/bilanco",
    );
    expect(screen.getByTestId("mt-seg-nakit-akisi")).toHaveAttribute(
      "href",
      "/mali-tablolar/nakit-akisi",
    );
  });

  it("🔴 E11:67 `Gelir Tablosu` BAĞLANTI DEĞİLDİR — bulunulan sayfa odur", () => {
    render(<FinancialStatementsHomeView />);
    const current = screen.getByTestId("mt-seg-current");
    expect(current).toHaveTextContent("Gelir Tablosu");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveClass("fs-mt-seg__item--current");
  });

  it("🔴 segmentte `aria-current` YOKTUR — kabuk sidebar'ı bu rotada zaten sürüyor", () => {
    render(<FinancialStatementsHomeView />);
    const marked = screen
      .getByTestId("mt-segments")
      .querySelectorAll('[aria-current="page"]');
    expect(marked).toHaveLength(0);
  });
});

describe("🔴 UCU OLMAYAN YÜZEYLER — silinmez, DEVRE DIŞI + TÜREVİ gerekçeyle basılır", () => {
  it("E11:71 `PDF İndir` devre dışıdır ve gerekçesi KAYITTAN gelir", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.getByTestId("mt-export-pdf")).toBeDisabled();
    expect(screen.getByTestId("mt-export-reason")).toHaveTextContent(
      SEAL(INCOME_STATEMENT_EXPORT_REASON),
    );
  });

  it("🔴 E11:76-81 dönem gezgini İŞLEMEZ: iki ok da devre dışıdır", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.getByTestId("mt-period-prev")).toBeDisabled();
    expect(screen.getByTestId("mt-period-next")).toBeDisabled();
    expect(screen.getByTestId("mt-period-reason")).toHaveTextContent(
      SEAL(INCOME_STATEMENT_PERIOD_REASON),
    );
  });

  it("🔴 dönem etiketi bir DÖNEM UYDURMAZ (mockup'ın `Ocak – Temmuz 2026`u basılmaz)", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.getByTestId("mt-period-label").textContent).not.toMatch(/20\d\d/);
  });

  it("E11:82 proje süzgeci devre dışıdır ve gerekçesi KAYITTAN gelir", () => {
    render(<FinancialStatementsHomeView />);
    expect(screen.getByTestId("mt-project-filter")).toBeDisabled();
    expect(screen.getByTestId("mt-project-filter-reason")).toHaveTextContent(
      SEAL(PROJECT_FILTER_REASON),
    );
  });

  it("E11:87-147 · 151-167 · 169-189 — ÜÇ kart da devre dışıdır", () => {
    render(<FinancialStatementsHomeView />);
    for (const testId of ["mt-income-statement", "mt-performance", "mt-profitability"]) {
      expect(screen.getByTestId(testId)).toHaveClass("fs-mt-card--disabled");
    }
    expect(screen.getByTestId("mt-income-statement-reason")).toHaveTextContent(
      SEAL(INCOME_STATEMENT_REASON),
    );
    expect(screen.getByTestId("mt-performance-reason")).toHaveTextContent(
      SEAL(PERFORMANCE_SUMMARY_REASON),
    );
    expect(screen.getByTestId("mt-profitability-reason")).toHaveTextContent(
      SEAL(PROJECT_PROFITABILITY_REASON),
    );
  });

  it("🔴 hiçbir kart SAYI İCAT ETMEZ (mockup'ın rakamları ekrana sızmaz)", () => {
    render(<FinancialStatementsHomeView />);
    const text = screen.getByTestId("mt-grid").textContent ?? "";
    for (const invented of ["24.870.500", "24.994.700", "3.512.700", "%14,1", "%76,7"]) {
      expect(text).not.toContain(invented);
    }
  });
});

describe("🔴 altı anahtar kayıtta GERÇEKTEN tanımlıdır", () => {
  it("hiçbiri genel fallback metnine düşmez ve ölçülmüş olguyu söyler", async () => {
    // Mühür KALDIRILIR: gerçek `pendingModuleLabel` koşar. Anahtar kayıtta
    // yoksa "İlgili modülle birlikte gelir" döner — o metin bu ekranda hiçbir
    // şey ANLATMAZ ve kabul edilemez.
    const actual =
      await vi.importActual<typeof import("@/lib/pending-modules")>("@/lib/pending-modules");
    const keys = [
      INCOME_STATEMENT_REASON,
      INCOME_STATEMENT_EXPORT_REASON,
      INCOME_STATEMENT_PERIOD_REASON,
      PROJECT_FILTER_REASON,
      PERFORMANCE_SUMMARY_REASON,
      PROJECT_PROFITABILITY_REASON,
    ];
    // Altı anahtar da BİRBİRİNDEN farklıdır (K6: ekran/yüzey başına ayrı metin).
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      const label = actual.pendingModuleLabel(key);
      expect(label).not.toBe("İlgili modülle birlikte gelir");
      expect(label.length).toBeGreaterThan(20);
    }
  });
});

describe("yetki", () => {
  it("görüntüleme yetkisi AÇIKÇA `none` ise erişim reddedilir", () => {
    setSession("none");
    render(<FinancialStatementsHomeView />);
    expect(screen.queryByRole("heading", { name: "Mali Tablolar" })).toBeNull();
  });

  it("seviye BİLİNMİYORSA ekran AÇIK kalır (bilinmezlik kuralı)", () => {
    setSession(undefined);
    render(<FinancialStatementsHomeView />);
    expect(
      screen.getByRole("heading", { name: "Mali Tablolar", level: 1 }),
    ).toBeInTheDocument();
  });
});

describe("E11:82 süzgecin tek seçeneği", () => {
  it("`Tüm Projeler` DIŞINDA bir seçenek SUNULMAZ (süzgeç uçta yok)", () => {
    render(<FinancialStatementsHomeView />);
    const options = within(screen.getByTestId("mt-project-filter")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Tüm Projeler"]);
  });
});
