import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseQueryResult } from "@tanstack/react-query";

import { usePreviousAllocation } from "@/lib/api/hooks/useEvDay";
import type { EvCodeNode, EvDayView } from "@/lib/api/models";
import { DEFAULT_PF_BANDS } from "@/lib/earned-value";

import { stripValues } from "./allocation-model";
import { HourAllocationBlock } from "./HourAllocationBlock";
import { buildSubmitState, resolveAllocationAccess, type AccessInput } from "./submit-checks";
import { useAllocationDraft } from "./useAllocationDraft";
import {
  DAY,
  SITE_ID,
  codeTree,
  dayView,
  previousAllocation,
} from "./diary-fixtures";

// PLN-F2.3 · Saat Dağıtımı bloğu — gerçek taslak hook'u + sahte EV yazma uçları.
vi.mock("@/lib/api/hooks/useEvDay", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useEvDay")>()),
  usePreviousAllocation: vi.fn(),
}));

const prevRefetch = vi.fn();

function treeQuery(nodes: EvCodeNode[] = codeTree()): UseQueryResult<EvCodeNode[], Error> {
  return { data: nodes, isLoading: false, isError: false, refetch: vi.fn(async () => ({ data: nodes })) } as never;
}

const ENGINEER: AccessInput = { evLevel: "draft", diaryCanWrite: true, isLocked: false, isSiteCompleted: false };

function Harness({ view, access = ENGINEER }: { view: EvDayView; access?: AccessInput }) {
  const api = useAllocationDraft(SITE_ID, view);
  if (api === null) return null;
  const resolved = resolveAllocationAccess(access);
  const strip = stripValues(view, api.draft, api.isDirty);
  const submitState = buildSubmitState({
    submit: view.submit,
    unallocated: strip.unallocated,
    reason: api.draft.reason,
    isDirty: api.isDirty,
    isLocked: access.isLocked,
    isForeman: resolved.isForeman,
  });
  return (
    <HourAllocationBlock
      siteId={SITE_ID}
      day={DAY}
      view={view}
      codeTree={treeQuery()}
      bands={DEFAULT_PF_BANDS}
      access={resolved}
      draft={api.draft}
      isDirty={api.isDirty}
      invalidCount={api.invalidCount}
      onDraftChange={api.update}
      submitState={submitState}
    />
  );
}

function cell(person: string, codeShort: string): HTMLInputElement {
  return screen.getByLabelText(`${person} · ${codeShort} saati`) as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  prevRefetch.mockResolvedValue({ data: previousAllocation() });
  vi.mocked(usePreviousAllocation).mockReturnValue({ refetch: prevRefetch } as never);
});

describe("HourAllocationBlock — ızgara (İ:446-489)", () => {
  it("kişi × iş kodu hücreleri, şerit, Kalan rozetleri backend satırlarından", () => {
    render(<Harness view={dayView()} />);
    expect(screen.getByRole("heading", { name: /Saat Dağıtımı/ })).toBeInTheDocument();
    expect(cell("Mehmet Demir", "Kalıp · Kat 6–10").value).toBe("9");
    expect(cell("Emre Koç", "Betonarme işleri").value).toBe("9");
    const strip = screen.getByText("Dağıtılmamış").closest("div") as HTMLElement;
    expect(within(strip).getByText("66")).toBeInTheDocument();
    const mehmet = screen.getByRole("rowheader", { name: /Mehmet Demir/ }).closest("tr") as HTMLElement;
    expect(within(mehmet).getByText("2")).toHaveClass("ev-diary-remain--under");
    expect(within(mehmet).getByText(/Puantaj değişti/)).toBeInTheDocument();
    const emre = screen.getByRole("rowheader", { name: /Emre Koç/ }).closest("tr") as HTMLElement;
    expect(emre.querySelector(".ev-diary-remain--ok")).not.toBeNull();
    expect(screen.getByText("Taşeron · 7 kişi × 8 sa")).toBeInTheDocument();
  });

  it("hücre düzenlenince Kalan ve şerit ANINDA önizlenir; kayıt TAM kümeyi PUT eder", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView()} />);
    await user.type(cell("Recep Uçar", "Kalıp · Kat 6–10"), "8");
    const recep = screen.getByRole("rowheader", { name: /Recep Uçar/ }).closest("tr") as HTMLElement;
    expect(recep.querySelector(".ev-diary-remain--ok")).not.toBeNull();
    const strip = screen.getByText("Dağıtılmamış").closest("div") as HTMLElement;
    expect(within(strip).getByText("58")).toBeInTheDocument();
    // Ayrı "Dağıtımı kaydet" düğmesi YOK (S1): kayıt çekirdeğin tek düğmesinden, `onBeforeSave` ile.
    expect(screen.queryByRole("button", { name: "Dağıtımı kaydet" })).not.toBeInTheDocument();
  });

  it("geçersiz hücre uyarısı (kayıt `onBeforeSave`de reddedilir)", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView()} />);
    await user.type(cell("Recep Uçar", "Kalıp · Kat 6–10"), "x");
    expect(screen.getByText("1 hücrede geçersiz değer")).toBeInTheDocument();
  });

  it("üst grup kolonunda kip düğmesi kuralı çevirir (İ:456)", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView()} />);
    await user.click(screen.getByRole("button", { name: "Miktara göre dağıtılır" }));
    expect(screen.getByRole("button", { name: "Doğrudan" })).toBeInTheDocument();
  });

  it("üst grup kolonunun gövde hücresi grup zeminini taşır, yaprak hücresi taşımaz (İ:666)", () => {
    render(<Harness view={dayView()} />);
    expect(cell("Emre Koç", "Betonarme işleri").closest("td")).toHaveClass("ev-diary-cell--group");
    expect(cell("Mehmet Demir", "Kalıp · Kat 6–10").closest("td")).not.toHaveClass("ev-diary-cell--group");
  });
});

describe("+ İş kodu ekle (İ:404-423)", () => {
  it("oransız yaprak PASİF '· oran yok'; oranlı yaprak kolon açar (yaprak = doğrudan)", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView()} />);
    await user.click(screen.getByRole("button", { name: "+ İş kodu ekle" }));
    const picker = screen.getByRole("dialog", { name: "İş kodu ekle" });
    expect(within(picker).getByRole("checkbox", { name: /Bölümsüz · oran yok/ })).toBeDisabled();
    const beton = within(picker).getAllByRole("checkbox", { name: /Kat 6–10/ })[1];
    await user.click(beton);
    expect(cell("Recep Uçar", "Beton döküm · Kat 6–10")).toBeInTheDocument();
    await user.click(within(picker).getByRole("button", { name: "Tamam" }));
    expect(screen.queryByRole("dialog", { name: "İş kodu ekle" })).not.toBeInTheDocument();
  });
});

describe("araç çubuğu eylemleri", () => {
  it("Dünkü dağılımı kopyala yalnız boş/eksik satırları doldurur", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView()} />);
    await user.click(screen.getByRole("button", { name: "Dünkü dağılımı kopyala" }));
    expect(await screen.findByText(/22\.09\.2026 dağılım deseni kopyalandı/)).toBeInTheDocument();
    expect(cell("Mehmet Demir", "Kalıp · Kat 6–10").value).toBe("11");
    expect(cell("Recep Uçar", "Beton döküm · Kat 6–10").value).toBe("8");
    expect(cell("Emre Koç", "Betonarme işleri").value).toBe("9");
  });

  it("gönderilmiş gün yoksa bildirim", async () => {
    const user = userEvent.setup();
    prevRefetch.mockResolvedValue({ data: previousAllocation({ day: null, rows: [], codes: [] }) });
    render(<Harness view={dayView()} />);
    await user.click(screen.getByRole("button", { name: "Dünkü dağılımı kopyala" }));
    expect(await screen.findByText("Kopyalanacak gönderilmiş bir gün yok.")).toBeInTheDocument();
  });

  it("Seçili kişilere toplu ata: seçim → kod çipi → saat → Uygula", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView()} />);
    expect(screen.getByRole("button", { name: "Seçili kişilere toplu ata · 0" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Recep Uçar seç" }));
    await user.click(screen.getByRole("checkbox", { name: "Kaya Duvar seç" }));
    await user.click(screen.getByRole("button", { name: "Seçili kişilere toplu ata · 2" }));
    const panel = screen.getByRole("group", { name: "Toplu atama" });
    await user.click(within(panel).getByRole("button", { name: "Kalıp · Kat 6–10" }));
    await user.type(within(panel).getByLabelText("Toplu atanacak saat"), "4");
    await user.click(within(panel).getByRole("button", { name: "Uygula" }));
    expect(cell("Recep Uçar", "Kalıp · Kat 6–10").value).toBe("4");
    expect(cell("Kaya Duvar", "Kalıp · Kat 6–10").value).toBe("4");
    expect(screen.getByText("2 kişiye Kalıp · Kat 6–10 için 4 sa atandı")).toBeInTheDocument();
  });

  it("Kalanı orantılı dağıt (0,5 sa adım)", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView()} />);
    await user.click(screen.getByRole("button", { name: "Kalanı orantılı dağıt" }));
    expect(cell("Recep Uçar", "Betonarme işleri").value).toBe("4");
    expect(cell("Recep Uçar", "Kalıp · Kat 6–10").value).toBe("4");
  });
});

describe("salt okunur hâller (K17 · kilit · tamamlanmış şantiye)", () => {
  it("kilitli gün: hücreler, araçlar ve gerekçe KAPALI; 'Salt okunur · gün kilitli'", () => {
    render(<Harness view={dayView({ lock: { locked: true, report_date: "2026-09-25", approved_at: null, approved_by: null, unlock: null } })} access={{ ...ENGINEER, evLevel: "approve", isLocked: true }} />);
    expect(screen.getByText("Salt okunur · gün kilitli")).toBeInTheDocument();
    expect(cell("Mehmet Demir", "Kalıp · Kat 6–10")).toBeDisabled();
    expect(screen.getByRole("button", { name: "+ İş kodu ekle" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dünkü dağılımı kopyala" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Miktara göre dağıtılır" })).toBeDisabled();
    expect(screen.getByText("Gün kilitli")).toBeInTheDocument();
  });

  it("formen (earned_value view): soluk blok, düzenleme yok (bant `topBanner`da, S3)", () => {
    render(<Harness view={dayView()} access={{ ...ENGINEER, evLevel: "view" }} />);
    expect(screen.queryByText("Formen görünümü.")).not.toBeInTheDocument();
    expect(screen.getByText("Salt okunur · Saat Dağıtımı mühendis tarafından yapılır")).toBeInTheDocument();
    expect(cell("Mehmet Demir", "Kalıp · Kat 6–10")).toBeDisabled();
    expect(screen.getByRole("region", { name: /Saat Dağıtımı/ })).toHaveClass("ev-diary-alloc--faded");
  });

  it("tamamlanmış şantiye: salt okunur", () => {
    render(<Harness view={dayView()} access={{ ...ENGINEER, isSiteCompleted: true }} />);
    expect(screen.getByText("Salt okunur · şantiye tamamlandı")).toBeInTheDocument();
    expect(cell("Emre Koç", "Betonarme işleri")).toBeDisabled();
  });
});

describe("Gönder kontrol çubuğu (İ:493-510)", () => {
  it("dağıtılmamış saat: 'gerekçe yaz' gerekçe alanını açar; yazılan gerekçe kayıtla gider", async () => {
    const user = userEvent.setup();
    render(<Harness view={dayView({ submit: { can_submit: false, reasons: ["66 a-s dağıtılmamış; gerekçe gerekli"] } })} />);
    expect(screen.getByText("66 a-s dağıtılmamış · gönderim engelli")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "gerekçe yaz" }));
    await user.type(screen.getByLabelText("Dağıtılmamış saat gerekçesi"), "temizlik");
    expect(screen.getByText("66 a-s dağıtılmamış · gerekçe yazıldı")).toBeInTheDocument();
  });
});
