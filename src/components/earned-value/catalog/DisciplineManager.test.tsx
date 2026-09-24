import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { backendClient } from "@/lib/api/client";
import type { AccessLevel } from "@/lib/auth/permissions";

import { BETON, DEMIR, DUV, INC, KAB, SIVA, fail, mockGets, ok, renderScreen } from "./catalog-test-utils";

vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

let permissionLevel: AccessLevel | undefined = "admin";
vi.mock("@/lib/auth/useModulePermission", () => ({
  useModulePermission: () => ({
    level: permissionLevel,
    canView: true,
    canWrite: true,
    canDelete: true,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  permissionLevel = "admin";
  mockGets({ disciplines: [KAB, DUV, INC], catalog: [BETON, DEMIR, SIVA] });
});

async function openManager(label = "Disiplinleri yönet"): Promise<HTMLElement> {
  const user = userEvent.setup();
  renderScreen();
  await screen.findByRole("button", { name: "Beton döküm" });
  await user.click(screen.getByRole("button", { name: label }));
  return screen.getByRole("dialog", { name: "Disiplinler" });
}

function rowOf(dialog: HTMLElement, code: string): HTMLElement {
  const row = within(dialog).getByText(code).closest("tr");
  if (!row) throw new Error(`satır yok: ${code}`);
  return row;
}

describe("liste modalı (M6 · Disiplin Yönetimi:147-221)", () => {
  it("renk karesi VERİDEN, kod, ad, varsayılan rozet, kullanan iş tipi sayısı", async () => {
    const dialog = await openManager();
    const kab = within(rowOf(dialog, "KAB"));
    expect(kab.getByText("Kaba İnşaat")).toBeInTheDocument();
    expect(kab.getByText("Kendi")).toBeInTheDocument();
    expect(kab.getByText("2 iş tipi")).toBeInTheDocument();
    expect(kab.getByTestId("discipline-swatch")).toHaveStyle({ backgroundColor: "#2563eb" });
    expect(within(rowOf(dialog, "DUV")).getByText("Taşeron")).toBeInTheDocument();
    expect(within(rowOf(dialog, "INC")).getByText("0 iş tipi")).toBeInTheDocument();
  });

  it("CEO kararı (f): şantiye sayısı BASILMAZ — '— şantiye' hiçbir satırda yok; açıklama yalnız iş tipini tanımlar", async () => {
    const dialog = await openManager();
    expect(within(dialog).queryByText(/şantiye$/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/—\s*şantiye/)).not.toBeInTheDocument();
    expect(within(dialog).getByText("Kullanan = bu disipline bağlı iş tipi")).toBeInTheDocument();
  });

  it("kullanımdaki disiplinde Sil PASİF ve gerekçe EKRANDA (title değil)", async () => {
    const dialog = await openManager();
    const kab = within(rowOf(dialog, "KAB"));
    const del = kab.getByRole("button", { name: "Sil" });
    expect(del).toBeDisabled();
    expect(del).not.toHaveAttribute("title");
    expect(kab.getByText("Kullanımda · silinemez")).toBeVisible();

    const inc = within(rowOf(dialog, "INC"));
    expect(inc.getByRole("button", { name: "Sil" })).toBeEnabled();
    expect(inc.queryByText("Kullanımda · silinemez")).not.toBeInTheDocument();
  });

  it("full (admin değil): Düzenle var, Sil YOK (B1-9 sil = admin)", async () => {
    permissionLevel = "full";
    const dialog = await openManager();
    const inc = within(rowOf(dialog, "INC"));
    expect(inc.getByRole("button", { name: "Düzenle" })).toBeInTheDocument();
    expect(inc.queryByRole("button", { name: "Sil" })).not.toBeInTheDocument();
  });

  it("salt okunur (draft): giriş 'Disiplinler', şerit görünür, ekle/düzenle/sil gizli", async () => {
    permissionLevel = "draft";
    const dialog = await openManager("Disiplinler");
    expect(within(dialog).getByRole("note")).toHaveTextContent(
      "Salt okunur · disiplin listesini yalnız tam yetki (full) değiştirir",
    );
    expect(within(dialog).queryByRole("button", { name: "+ Yeni disiplin" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Düzenle" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Sil" })).not.toBeInTheDocument();
    expect(within(dialog).getByText("Değişiklik için tam yetki gerekir")).toBeInTheDocument();
  });

  it("disiplin listesi hatası: 'Disiplinler yüklenemedi'", async () => {
    vi.mocked(backendClient.GET).mockImplementation((async (path: string) =>
      path === "/earned-value/disciplines" ? fail(500, "x") : ok([BETON])) as never);
    const dialog = await openManager();
    expect(await within(dialog).findByText("Disiplinler yüklenemedi")).toBeInTheDocument();
  });

  it("boş liste: 'Disiplin yok' + ekleme girişi", async () => {
    mockGets({ disciplines: [], catalog: [BETON] });
    const dialog = await openManager();
    expect(within(dialog).getByText("Disiplin yok")).toBeInTheDocument();
  });
});

describe("Disiplin Ekle / Düzenle formu (M6:227-304)", () => {
  it("palet 5 renkle başlar (Bütçe:523); yeni disiplinin rengi sırayla başa döner", async () => {
    const user = userEvent.setup();
    const dialog = await openManager();
    await user.click(within(dialog).getByRole("button", { name: "+ Yeni disiplin" }));
    const form = screen.getByRole("dialog", { name: "Disiplin Ekle" });

    const palette = within(form).getByRole("group", { name: "Grafik rengi" });
    const swatches = within(palette).getAllByRole("button");
    expect(swatches.map((b) => b.textContent)).toEqual(["#2563eb", "#93c5fd", "#64748b", "#cbd5e1", "#e2e8f0"]);
    // 3 disiplin var → 4. renk (#cbd5e1) önerilir
    expect(within(palette).getByRole("button", { name: "#cbd5e1" })).toHaveAttribute("aria-pressed", "true");
  });

  it("kod tekrarı ve boş ad: '2 alan hatalı', POST yok", async () => {
    const user = userEvent.setup();
    const dialog = await openManager();
    await user.click(within(dialog).getByRole("button", { name: "+ Yeni disiplin" }));
    const form = screen.getByRole("dialog", { name: "Disiplin Ekle" });

    await user.type(within(form).getByLabelText("Kod"), "kab");
    await user.click(within(form).getByRole("button", { name: "Kaydet" }));

    expect(within(form).getByText("2 alan hatalı.")).toBeInTheDocument();
    expect(within(form).getByText("Bu kod zaten var: Kaba İnşaat")).toBeInTheDocument();
    expect(within(form).getByText("Disiplin adı zorunlu")).toBeInTheDocument();
    expect(backendClient.POST).not.toHaveBeenCalled();
  });

  it("geçerli ekleme: kod büyük harfe çevrilir, gövde POST edilir, listeye dönülür + bildirim", async () => {
    const user = userEvent.setup();
    vi.mocked(backendClient.POST).mockResolvedValue(ok({ ...INC, id: "d-new", code: "MEK" }, 201));
    const dialog = await openManager();
    await user.click(within(dialog).getByRole("button", { name: "+ Yeni disiplin" }));
    const form = screen.getByRole("dialog", { name: "Disiplin Ekle" });

    await user.type(within(form).getByLabelText("Kod"), "mek");
    await user.type(within(form).getByLabelText("Disiplin adı"), "Mekanik Tesisat");
    await user.click(within(within(form).getByRole("group", { name: "Grafik rengi" })).getByRole("button", { name: "#64748b" }));
    await user.click(within(within(form).getByRole("group", { name: "Varsayılan yapan" })).getByRole("button", { name: "Taşeron" }));
    await user.click(within(form).getByRole("button", { name: "Kaydet" }));

    await waitFor(() =>
      expect(backendClient.POST).toHaveBeenCalledWith("/earned-value/disciplines", {
        body: {
          code: "MEK",
          name: "Mekanik Tesisat",
          color: "#64748b",
          default_contractor_type: "subcon",
          sort_order: 4,
        },
      }),
    );
    const list = await screen.findByRole("dialog", { name: "Disiplinler" });
    expect(within(list).getByText("Mekanik Tesisat eklendi")).toBeInTheDocument();
  });

  it("düzenleme: KULLANIMDAKİ disiplinin kodu da değişir (F0-7); yalnız değişen alan PATCH", async () => {
    const user = userEvent.setup();
    vi.mocked(backendClient.PATCH).mockResolvedValue(ok({ ...KAB, code: "KBA" }));
    const dialog = await openManager();
    await user.click(within(rowOf(dialog, "KAB")).getByRole("button", { name: "Düzenle" }));
    const form = screen.getByRole("dialog", { name: "Disiplin Düzenle" });

    const code = await within(form).findByDisplayValue("KAB");
    expect(code).not.toHaveAttribute("readonly");
    expect(within(form).getByText("Şirkette tekil · kullanımda da düzenlenir")).toBeInTheDocument();
    await user.clear(code);
    await user.type(code, "kba");
    await user.click(within(form).getByRole("button", { name: "Kaydet" }));

    await waitFor(() =>
      expect(backendClient.PATCH).toHaveBeenCalledWith("/earned-value/disciplines/{discipline_id}", {
        params: { path: { discipline_id: "d-kab" } },
        body: { code: "KBA" },
      }),
    );
  });

  it("backend 409 (kod alınmış) formda gösterilir", async () => {
    const user = userEvent.setup();
    vi.mocked(backendClient.POST).mockResolvedValue(fail(409, "Bu disiplin kodu zaten kayıtlı"));
    const dialog = await openManager();
    await user.click(within(dialog).getByRole("button", { name: "+ Yeni disiplin" }));
    const form = screen.getByRole("dialog", { name: "Disiplin Ekle" });
    await user.type(within(form).getByLabelText("Kod"), "YNI");
    await user.type(within(form).getByLabelText("Disiplin adı"), "Yeni");
    await user.click(within(form).getByRole("button", { name: "Kaydet" }));

    expect(await within(form).findByText("Bu disiplin kodu zaten kayıtlı")).toBeInTheDocument();
  });
});

describe("silme onayı (M6:307-337)", () => {
  it("kullanılmayan disiplin: onay → DELETE → listeye dönüş + bildirim", async () => {
    const user = userEvent.setup();
    vi.mocked(backendClient.DELETE).mockResolvedValue(ok(undefined, 204));
    const dialog = await openManager();
    await user.click(within(rowOf(dialog, "INC")).getByRole("button", { name: "Sil" }));

    const confirm = screen.getByRole("dialog", { name: "İnce İşler disiplini silinsin mi?" });
    expect(within(confirm).getByText("Kullanan iş tipi").nextElementSibling).toHaveTextContent("0");
    await user.click(within(confirm).getByRole("button", { name: "Disiplini sil" }));

    await waitFor(() =>
      expect(backendClient.DELETE).toHaveBeenCalledWith("/earned-value/disciplines/{discipline_id}", {
        params: { path: { discipline_id: "d-inc" } },
      }),
    );
    const list = await screen.findByRole("dialog", { name: "Disiplinler" });
    expect(within(list).getByText("İnce İşler silindi")).toBeInTheDocument();
  });

  it("CEO kararı (f): onay özetinde 'Kullanan şantiye' satırı YOK", async () => {
    const user = userEvent.setup();
    const dialog = await openManager();
    await user.click(within(rowOf(dialog, "INC")).getByRole("button", { name: "Sil" }));
    const confirm = screen.getByRole("dialog", { name: "İnce İşler disiplini silinsin mi?" });
    expect(within(confirm).queryByText("Kullanan şantiye")).not.toBeInTheDocument();
    expect(within(confirm).queryByText(/—\s*şantiye/)).not.toBeInTheDocument();
    expect(within(confirm).getByText("Kullanan iş tipi")).toBeInTheDocument();
  });

  it("409 (bütçede eşlenmiş) → mesaj onay modalında kalır", async () => {
    const user = userEvent.setup();
    vi.mocked(backendClient.DELETE).mockResolvedValue(
      fail(409, "Disiplin kullanımda (BOQ grubu eşlemesi, katalog ya da baseline); silinemez"),
    );
    const dialog = await openManager();
    await user.click(within(rowOf(dialog, "INC")).getByRole("button", { name: "Sil" }));
    const confirm = screen.getByRole("dialog", { name: "İnce İşler disiplini silinsin mi?" });
    await user.click(within(confirm).getByRole("button", { name: "Disiplini sil" }));

    expect(
      await within(confirm).findByText("Disiplin kullanımda (BOQ grubu eşlemesi, katalog ya da baseline); silinemez"),
    ).toBeInTheDocument();
  });
});
