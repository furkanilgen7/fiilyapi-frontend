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
import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

// F-BLMSEK · Bölüm Detay › "Günlük Kayıt" sekmesinin EKRAN BAĞLANTISI.
// AYRI dosyadır: `SectionDetailView.test.tsx` 767 satırla 800 tavanına yakın.
// Buradaki iddialar panelin İÇ mantığını değil, EKRANIN panele ne verdiğini
// (bölüm kimliği · şantiye listesi · süzgeçsiz sorgu) bekçiler.

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
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/components/timesheet/useTimesheetData", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/timesheet/useTimesheetData")>()),
  useTimesheetData: vi.fn(),
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";
const SECTION_ID = "55555555-5555-5555-5555-555555555555";
const OTHER_SECTION_ID = "66666666-6666-6666-6666-666666666666";
const SECTION_NAME = "Kat 6–10 Kaba İnşaat";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID, siteId: SITE_ID, sectionId: SECTION_ID }),
}));

function listItem(overrides: Partial<SiteDiaryEntryListItem> = {}): SiteDiaryEntryListItem {
  return {
    id: "d-1",
    site_id: SITE_ID,
    project_id: PROJECT_ID,
    entry_date: "2026-07-15",
    section_id: SECTION_ID,
    weather: "sunny",
    has_incident: false,
    status: "submitted",
    worker_total: 42,
    lines_total: "182400.00",
    created_by: "u-2",
    created_at: "2026-07-15T08:00:00Z",
    ...overrides,
  } as SiteDiaryEntryListItem;
}

function mockAll(items: SiteDiaryEntryListItem[]) {
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
      sections: [
        { id: SECTION_ID, name: SECTION_NAME },
        { id: OTHER_SECTION_ID, name: "Peyzaj" },
      ],
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
    data: { items, total: items.length },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
}

async function openDiaryTab() {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SectionDetailView />
    </QueryClientProvider>,
  );
  await user.click(screen.getByRole("tab", { name: "Günlük Kayıt" }));
  return screen.getByRole("tabpanel");
}

describe("SectionDetailView — Günlük Kayıt sekmesi (F-BLMSEK)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sekme artık GERÇEK panel basar, gerekçeli yer tutucu DEĞİL", async () => {
    mockAll([listItem()]);
    const panel = await openDiaryTab();

    expect(within(panel).getByTestId("section-diary")).toBeInTheDocument();
    expect(within(panel).queryByText(/kırılmıyor/)).not.toBeInTheDocument();
  });

  it("BU bölümün kaydını basar, BAŞKA bölümünkini basmaz (ekran doğru kimliği geçiriyor)", async () => {
    mockAll([
      listItem({ id: "hedef", entry_date: "2026-07-15" }),
      listItem({ id: "baska", section_id: OTHER_SECTION_ID, entry_date: "2026-07-16" }),
    ]);
    const panel = await openDiaryTab();

    expect(within(panel).getByText("15 Temmuz")).toBeInTheDocument();
    expect(within(panel).queryByText("16 Temmuz")).not.toBeInTheDocument();
    expect(within(panel).getByTestId("section-diary-note")).toHaveTextContent(
      "başka bölüme atanmış 1",
    );
  });

  it("satır alt metni bölüm ADINI çözer — `site.sections` gerçekten geçirilir", async () => {
    // 🔴 MUTASYON DENETİMİ AÇIĞI (F-BLMSEK): `sections={[]}` geçiren mutant
    // TÜM testlerden geçiyordu — satır sessizce "Bölüm adı yok" yer tutucusuna
    // düşerdi ve kimse fark etmezdi. Bu bekçi o boşluğu kapatır.
    mockAll([listItem()]);
    const panel = await openDiaryTab();

    // Başlık de bölüm adını taşır — iddia SATIRIN kendisine kilitlenir.
    const row = within(panel).getAllByRole("listitem")[0];
    expect(row).toHaveTextContent(SECTION_NAME);
    expect(within(row).queryByText("Bölüm adı yok")).not.toBeInTheDocument();
  });

  it("günlük listesi SÜZGEÇSİZ çekilir — şantiye ekranıyla AYNI önbellek anahtarı", async () => {
    // 🔴 Dönem/limit süzgeci verilseydi anahtar farklılaşır, aynı veri İKİNCİ
    // kez çekilirdi. `section_id` zaten liste ucunda YOK (sessizce yok sayılır).
    mockAll([listItem()]);
    await openDiaryTab();

    expect(useSiteDiaryEntries).toHaveBeenCalledWith(SITE_ID);
  });

  it("öbür sekmeler HÂLÂ yer tutucu — canlılık sızmaz", async () => {
    mockAll([listItem()]);
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SectionDetailView />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("tab", { name: "Malzeme" }));
    const panel = screen.getByRole("tabpanel");

    // 🔴 STOK-BOLUM — "Malzeme HÂLÂ yer tutucu" iddiası ÇÜRÜDÜ; sekme artık
    // kendi verisini basıyor. Bu testin ASIL işi SIZINTIDIR ve o korunur:
    // günlük kayıt paneli başka sekmeye SIZMAZ.
    expect(within(panel).queryByTestId("section-diary")).not.toBeInTheDocument();
    // Malzeme paneli KENDİ kabuğunu basar (boş bir tabpanel değil).
    expect(within(panel).getByTestId("section-stock")).toBeInTheDocument();
  });
});
