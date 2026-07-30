import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SectionsCard } from "./SectionsCard";
import { emptySectionRow, type SectionRow } from "./sections-validate";
import { USER_LIST_NOTES } from "./constants";
import { pendingModuleLabel } from "@/lib/pending-modules";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";

vi.mock("@/lib/api/hooks/useUserOptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useUserOptions")>()),
  useUserOptions: vi.fn(),
}));

const OPTIONS = [
  { id: "u-1", full_name: "Sercan Öztürk", title: "Şantiye Şefi" },
  { id: "u-2", full_name: "Kadir Yıldız", title: null },
];

function mockUsers(value: Partial<ReturnType<typeof useUserOptions>>) {
  vi.mocked(useUserOptions).mockReturnValue({
    options: [],
    isForbidden: false,
    isLoading: false,
    isError: false,
    ...value,
  } as never);
}

/** Gerçek state'le sarmalayıcı — satır ekleme/silme davranışı ancak böyle sınanır. */
function Harness({ initial }: { initial?: SectionRow[] }) {
  const [rows, setRows] = useState<SectionRow[]>(initial ?? [emptySectionRow()]);
  return <SectionsCard rows={rows} onRowsChange={setRows} />;
}

function bodyRows(): HTMLElement[] {
  // Boş durum satırı ve kesikli ekle satırı veri satırı DEĞİLDİR.
  return screen.getAllByTestId("section-row");
}

describe("SectionsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsers({ options: OPTIONS });
  });

  it("acilista bir bos satir vardir", () => {
    render(<Harness />);
    expect(bodyRows()).toHaveLength(1);
  });

  it("basliktaki '+ Bolum Ekle' yeni satir ekler ve odak yeni satirin adina gider", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "+ Bölüm Ekle" }));

    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(document.activeElement).toBe(within(rows[1]).getByLabelText("2. bölümün adı"));
  });

  it("alttaki kesikli buton da ayni isi yapar", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Bölüm ekle" }));

    expect(bodyRows()).toHaveLength(2);
  });

  it("kesikli butonun metni 'Bolum ekle'dir — 'veya sablon kullan' YOK", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Bölüm ekle" })).toBeInTheDocument();
    expect(screen.queryByText(/şablon/i)).not.toBeInTheDocument();
  });

  it("× butonu satiri kaldirir ve hicbir ag istegi atmaz", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<Harness initial={[emptySectionRow(), emptySectionRow()]} />);

    await user.click(screen.getByRole("button", { name: "1. bölümü sil" }));

    expect(bodyRows()).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("son satir da silinebilir; sifir bolum gecerlidir", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "1. bölümü sil" }));

    expect(screen.queryAllByTestId("section-row")).toHaveLength(0);
  });

  it("tum satirlar silinince bos durum satiri basar", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "1. bölümü sil" }));

    expect(
      screen.getByText("Henüz bölüm eklenmedi — şantiye bölümsüz de oluşturulabilir."),
    ).toBeInTheDocument();
  });

  it("silme sonrasi odak sonraki satirin adina, yoksa kesikli butona gider", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[emptySectionRow(), emptySectionRow()]} />);

    await user.click(screen.getByRole("button", { name: "1. bölümü sil" }));
    expect(document.activeElement).toBe(screen.getByLabelText("1. bölümün adı"));

    await user.click(screen.getByRole("button", { name: "1. bölümü sil" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Bölüm ekle" }));
  });

  it("Tahmini Bedel hucresinde hicbir input yoktur", () => {
    render(<Harness />);
    const cell = screen.getByTestId("section-amount-cell");
    expect(cell.querySelector("input")).toBeNull();
    expect(cell.querySelector("select")).toBeNull();
  });

  it("Tahmini Bedel hucresi '—' metni + boq pendingModuleLabel title'i tasir", () => {
    render(<Harness />);
    const cell = screen.getByTestId("section-amount-cell");
    expect(cell).toHaveAttribute("title", pendingModuleLabel("boq"));
    expect(cell.textContent).toContain("—");
    expect(cell.textContent).toContain("İş kalemlerinden hesaplanacak");
  });

  it("sekme sirasi: ad -> sorumlu -> baslangic -> bitis -> sil", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const row = bodyRows()[0];

    within(row).getByLabelText("1. bölümün adı").focus();
    await user.tab();
    expect(document.activeElement).toBe(within(row).getByLabelText("1. bölümün sorumlusu"));
    await user.tab();
    expect(document.activeElement).toBe(within(row).getByLabelText("1. bölümün başlangıç tarihi"));
    await user.tab();
    expect(document.activeElement).toBe(within(row).getByLabelText("1. bölümün bitiş tarihi"));
    await user.tab();
    expect(document.activeElement).toBe(within(row).getByRole("button", { name: "1. bölümü sil" }));
  });

  it("tablo icinde Enter yeni satir ekler ve formu GONDERMEZ", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness />
      </form>,
    );

    screen.getByLabelText("1. bölümün adı").focus();
    await user.keyboard("{Enter}");

    expect(bodyRows()).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("tablo icinde Escape hicbir sey yapmaz", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByLabelText("1. bölümün adı").focus();
    await user.keyboard("{Escape}");

    expect(bodyRows()).toHaveLength(1);
  });

  it("sorumlu secicisinin degeri user.id'dir", () => {
    render(<Harness />);
    const select = screen.getByLabelText("1. bölümün sorumlusu");
    const values = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(values).toEqual(["", "u-1", "u-2"]);
  });

  it("satir silme butonu aria-label='{n}. bolumu sil' tasir", () => {
    render(<Harness initial={[emptySectionRow(), emptySectionRow()]} />);
    expect(screen.getByRole("button", { name: "1. bölümü sil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2. bölümü sil" })).toBeInTheDocument();
  });

  it("satirlar id ile anahtarlanir, index ile degil", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[emptySectionRow(), emptySectionRow()]} />);

    await user.type(screen.getByLabelText("1. bölümün adı"), "Birinci");
    await user.type(screen.getByLabelText("2. bölümün adı"), "İkinci");
    // Bastaki satiri silince kalan satirin degeri KAYMAZ (index key olsaydi kayardi).
    await user.click(screen.getByRole("button", { name: "1. bölümü sil" }));

    expect(screen.getByLabelText("1. bölümün adı")).toHaveValue("İkinci");
  });

  it("tablo caption ve th scope=col tasir", () => {
    render(<Harness />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Bölümler")).toBeInTheDocument();
    const heads = within(table).getAllByRole("columnheader");
    expect(heads.every((th) => th.getAttribute("scope") === "col")).toBe(true);
    expect(heads.map((th) => th.textContent)).toEqual([
      "Bölüm Adı",
      "Sorumlu",
      "Başlangıç",
      "Bitiş",
      "Tahmini Bedel",
      "",
    ]);
  });

  it("kart basligi, yan notu ve baslik butonu mockup 104-106 ile birebir", () => {
    render(<Harness />);
    expect(screen.getByText("🏗 Bölümler (Fazlar)")).toBeInTheDocument();
    expect(
      screen.getByText("Şantiye iş fazlarına bölünür — her bölümün kendi iş kalemleri olur"),
    ).toBeInTheDocument();
  });

  it("dogrulama hatalari TABLONUN ALTINDA '{n}. satir: {mesaj}' olarak listelenir", () => {
    render(
      <SectionsCard
        rows={[{ ...emptySectionRow(), startDate: "2026-01-01" }]}
        onRowsChange={vi.fn()}
        issues={[{ index: 0, field: "name", message: "Bölüm adı zorunludur." }]}
      />,
    );
    expect(screen.getByText("1. satır: Bölüm adı zorunludur.")).toBeInTheDocument();
    const nameInput = screen.getByLabelText("1. bölümün adı");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput.getAttribute("aria-describedby")).toBeTruthy();
  });
});

// Plan TZ-4b: 403 BEKLENEN davranistir; sorumlu secicisi sessiz bos liste ile birakilmaz.
describe("SectionsCard · kullanici listesi 403 zarif dususu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsers({ isError: true, isForbidden: true });
  });

  it("sorumlu secicisi disabled acilir ve tablo altinda gorunur aciklama basar", () => {
    render(<Harness />);
    expect(screen.getByLabelText("1. bölümün sorumlusu")).toBeDisabled();
    expect(screen.getByText(USER_LIST_NOTES.forbidden)).toBeInTheDocument();
  });

  it("aciklama aria-describedby ile sorumlu secicisine baglidir", () => {
    render(<Harness />);
    const note = screen.getByText(USER_LIST_NOTES.forbidden);
    expect(screen.getByLabelText("1. bölümün sorumlusu").getAttribute("aria-describedby")).toContain(
      note.id,
    );
  });

  it("403'e ragmen bolum satiri eklenebilir ve ad yazilabilir", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Bölüm ekle" }));
    await user.type(screen.getByLabelText("2. bölümün adı"), "B Blok");

    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByLabelText("2. bölümün adı")).toHaveValue("B Blok");
  });
});
