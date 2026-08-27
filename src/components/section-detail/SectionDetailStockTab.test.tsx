import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SectionDetailView } from "./SectionDetailView";
import { useSection } from "@/lib/api/hooks/useSection";
import { useSite } from "@/lib/api/hooks/useSites";
import { useBoq } from "@/lib/api/hooks/useBoq";
import { useSession } from "@/components/shell/SessionProvider";
import { useTimesheetData } from "@/components/timesheet/useTimesheetData";
import { buildTimesheetView } from "@/components/timesheet/derive";
import { useSiteDiaryEntries } from "@/lib/api/hooks/useSiteDiary";
import { useSiteSubcontractorPayments } from "@/lib/api/hooks/useSiteSubcontractorPayments";

// F-BLMSEK T3 · Bölüm Detay › "Malzeme" sekmesinin EKRAN BAĞLANTISI.
// AYRI dosyadır: `SectionDetailView.test.tsx` 775 satırla 800 tavanındadır.
//
// 🔑 BU DOSYANIN ASIL İŞİ: kullanıcının şikâyeti üç sekmenin AYNI GÖRÜNMESİYDİ
// (T1/T2 öncesi hepsi jenerik `CardEmptyState` basıyordu). T1/T2 ikisini
// canlıya aldı; Malzeme BİLİNÇLİ OLARAK pending kaldı (stok hareketi kaydı
// bölüm alanı taşımıyor — ölçüldü, `inventory/` SIFIR isabet). Bu dosya
// FARKLILAŞMA bekçisini taşır: üçü de basıldığında metinleri PAYLAŞMAMALI.

vi.mock("@/lib/api/hooks/useSection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSection")>()),
  useSection: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useBoq", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useBoq")>()),
  useBoq: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSiteDiary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSiteDiary")>()),
  useSiteDiaryEntries: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSiteSubcontractorPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSiteSubcontractorPayments")>()),
  useSiteSubcontractorPayments: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/components/timesheet/useTimesheetData", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/timesheet/useTimesheetData")>()),
  useTimesheetData: vi.fn(),
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";
const SECTION_ID = "55555555-5555-5555-5555-555555555555";
const SECTION_NAME = "Kat 6–10 Kaba İnşaat";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID, siteId: SITE_ID, sectionId: SECTION_ID }),
}));

function mockAll() {
  vi.mocked(useSession).mockReturnValue({
    me: {
      id: "u1",
      email: "a@b.c",
      full_name: "A",
      role_key: "admin",
      status: "active",
      permissions: { sites: "view" },
    },
    isLoading: false,
  } as never);
  vi.mocked(useSection).mockReturnValue({
    data: {
      id: SECTION_ID,
      code: "A-01",
      name: SECTION_NAME,
      status: "active",
      site_id: SITE_ID,
      milestones: [],
      manager_name: null,
      start_date: null,
      end_date: null,
      progress_pct: { available: false, value: null, pending_module: "boq" },
      boq_item_count: { available: false, count: null, pending_module: "boq" },
      budget: { available: false, value: null, pending_module: "boq" },
      worker_count: { available: false, count: null, pending_module: "timesheet" },
    },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useSite).mockReturnValue({
    data: {
      id: SITE_ID,
      name: "A-Blok Şantiyesi",
      project: { id: PROJECT_ID },
      sections: [{ id: SECTION_ID, name: SECTION_NAME }],
    },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useBoq).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null } as never);
  vi.mocked(useTimesheetData).mockImplementation((input) => ({
    view: buildTimesheetView({
      year: input.period.year,
      month: input.period.month,
      personnel: [],
      matrix: undefined,
      sectionId: input.sectionId,
    }),
    isLoading: false,
    isError: false,
    isForbidden: false,
    isPersonnelUnavailable: false,
    personnelTruncation: { isTruncated: false, shownCount: 0, totalCount: 0 },
  }));
  vi.mocked(useSiteDiaryEntries).mockReturnValue({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useSiteSubcontractorPayments).mockReturnValue({
    items: [],
    isLoading: false,
    isError: false,
    isPartial: false,
    truncation: { isTruncated: false, shownCount: 0, totalCount: 0 },
  });
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SectionDetailView />
    </QueryClientProvider>,
  );
}

async function openTab(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("tab", { name }));
  return screen.getByRole("tabpanel");
}

describe("SectionDetailView — Malzeme sekmesi (F-BLMSEK T3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("başlık jenerik '${label} — bu bölümde henüz görüntülenemiyor' şablonunu ARTIK kullanmaz", async () => {
    mockAll();
    renderView();
    const panel = await openTab("Malzeme");

    expect(
      within(panel).queryByText("Malzeme — bu bölümde henüz görüntülenemiyor"),
    ).not.toBeInTheDocument();
  });

  it("sekme hâlâ GENUINE pending — section_stock gerekçesi basılır", async () => {
    mockAll();
    renderView();
    const panel = await openTab("Malzeme");

    expect(
      within(panel).getByText(/Stok hareketi bölüm alanı taşımıyor/),
    ).toBeInTheDocument();
  });

  it("şantiye stok ekranına giden bağlantı basılır, bölüm süzgeci TAŞIMAZ", async () => {
    mockAll();
    renderView();
    const panel = await openTab("Malzeme");

    const link = within(panel).getByRole("link", { name: /stok/i });
    expect(link).toHaveAttribute("href", `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/stok`);
    expect(link.getAttribute("href")).not.toContain("?section=");
  });

  // 🔴 BU TESTİN ASIL AMACI: kullanıcının şikâyetinin regresyon bekçisi.
  // Üç sekmenin panel metinleri AYNI OLURSA (biri jenerikleştirilirse ya da
  // sahte bir "pending" gerekçesi geri eklenirse) bu test kırmızı olmalı.
  it("Malzeme / Hakediş / Günlük Kayıt panelleri BİRBİRİNDEN FARKLI metin basar", async () => {
    mockAll();
    renderView();

    const stockPanel = await openTab("Malzeme");
    const stockText = stockPanel.textContent ?? "";

    const paymentsPanel = await openTab("Hakediş");
    const paymentsText = paymentsPanel.textContent ?? "";

    const diaryPanel = await openTab("Günlük Kayıt");
    const diaryText = diaryPanel.textContent ?? "";

    expect(stockText).not.toBe(paymentsText);
    expect(stockText).not.toBe(diaryText);
    expect(paymentsText).not.toBe(diaryText);

    // Yalnız Malzeme pending gerekçesi taşır — canlı iki sekme MODÜL/SEKME
    // düzeyinde gerekçe BASMAZ. (Hakediş panelinin KAPSAM satırı — "İşveren
    // hakedişi bölüme kırılmıyor" — AYRI ve MEŞRU bir alan iddiasıdır, o
    // yüzden burada geniş bir "kırılmıyor" testi YAPILMAZ; ölü şablon
    // ifadeleri ADIYLA aranır.)
    expect(stockText).toMatch(/Stok hareketi bölüm alanı taşımıyor/);
    expect(paymentsText).not.toMatch(/Stok hareketi bölüm alanı taşımıyor/);
    expect(diaryText).not.toMatch(/Stok hareketi bölüm alanı taşımıyor/);
    expect(paymentsText).not.toMatch(/Hakediş bu bölüme henüz kırılmıyor/);
    expect(diaryText).not.toMatch(/bu bölüme henüz kırılmıyor/);

    // Jenerik şablon HİÇBİRİNDE basılmaz.
    expect(stockText).not.toMatch(/— bu bölümde henüz görüntülenemiyor/);
    expect(paymentsText).not.toMatch(/— bu bölümde henüz görüntülenemiyor/);
    expect(diaryText).not.toMatch(/— bu bölümde henüz görüntülenemiyor/);
  });
});
