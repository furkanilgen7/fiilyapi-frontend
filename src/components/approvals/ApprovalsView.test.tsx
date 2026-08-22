import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BackendError } from "@/lib/api/unwrap";
import type {
  ApprovalInboxItem,
  ApprovalInboxResponse,
  ApprovalStepRead,
} from "@/lib/api/hooks/useApprovals";
import { useApprovalInbox, useApprovalSettings } from "@/lib/api/hooks/useApprovals";

import { ApprovalsView } from "./ApprovalsView";

vi.mock("@/lib/api/hooks/useApprovals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useApprovals")>()),
  useApprovalInbox: vi.fn(),
  useApprovalSettings: vi.fn(),
}));

const THRESHOLD = "500000.00";

function step(partial: Partial<ApprovalStepRead>): ApprovalStepRead {
  return {
    step_no: 1,
    approval_role: "accounting",
    decided_at: null,
    decided_by_name: null,
    ...partial,
  };
}

function item(partial: Partial<ApprovalInboxItem> = {}): ApprovalInboxItem {
  return {
    chain_id: "chain-1",
    document_type: "subcontractor_progress_payment",
    document_id: "scpp-3",
    created_by_name: "Sercan Öztürk",
    created_at: "2026-07-20T08:52:00Z",
    threshold_snapshot: THRESHOLD,
    amount_snapshot: "1240000.00",
    current_step_no: 3,
    steps: [
      step({ step_no: 1, approval_role: "site_chief", decided_at: "2026-07-19T08:00:00Z" }),
      step({ step_no: 2, approval_role: "project_manager", decided_at: "2026-07-19T10:00:00Z" }),
      step({ step_no: 3, approval_role: "patron" }),
    ],
    title: "Akın İnşaat — Hakediş #47 (Betonarme)",
    subtitle: "Güneşkent A-Blok · Kat 6–8 · 07/2026",
    gross_amount: "1240000.00",
    net_amount: "1016800.00",
    ...partial,
  };
}

type InboxResult = ReturnType<typeof useApprovalInbox>;
type SettingsResult = ReturnType<typeof useApprovalSettings>;

function mockInbox(partial: Partial<ApprovalInboxResponse> | null, extra: Record<string, unknown> = {}) {
  const data =
    partial === null
      ? undefined
      : ({
          items: [item()],
          total: 1,
          limit: 200,
          offset: 0,
          my_approval_roles: ["patron"],
          ...partial,
        } satisfies ApprovalInboxResponse);
  vi.mocked(useApprovalInbox).mockReturnValue({
    data,
    error: null,
    isError: false,
    isLoading: false,
    ...extra,
  } as unknown as InboxResult);
}

function mockSettings(threshold: string | null, extra: Record<string, unknown> = {}) {
  vi.mocked(useApprovalSettings).mockReturnValue({
    data: threshold === null ? undefined : { approval_threshold_try: threshold },
    error: null,
    isError: false,
    isLoading: false,
    ...extra,
  } as unknown as SettingsResult);
}

function renderView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApprovalsView />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * OLUMSUZ iddia (`not.toHaveBeenCalled`) için bekleme: `waitFor` olumsuzu
 * bekçileyemez (ilk denemede geçer). Mutasyon isteği bir mikro-görevde
 * atıldığından sayacı okumadan önce kuyruğun boşalması BEKLENİR.
 */
async function flushMutations() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ApprovalsView — durumlar", () => {
  it("yükleniyor hâlinde liste yerine bekleme metni basılır", () => {
    mockInbox(null, { isLoading: true });
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.getByTestId("ok-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("ok-list")).not.toBeInTheDocument();
  });

  it("liste hatasında GÖRÜNÜR hata bandı basılır", () => {
    mockInbox(null, {
      isError: true,
      error: new BackendError(500, { detail: "sunucu patladı" }),
    });
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.getByTestId("ok-list-error")).toHaveTextContent("sunucu patladı");
  });

  it("403 AccessDenied'e düşer (ön yetki kapısı YOK, yalnız 403 türevi)", () => {
    mockInbox(null, { isError: true, error: new BackendError(403, null) });
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("boş küme özel bir metinle basılır", () => {
    mockInbox({ items: [], total: 0 });
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.getByTestId("ok-empty")).toBeInTheDocument();
  });

  it("🔴 'yüklendi' bayrağı KAYNAK BAŞINA basılır (tek bayrak ikinciyi gizlerdi)", () => {
    mockInbox({});
    mockSettings(null, { isLoading: true });
    renderView();
    expect(screen.getByTestId("ok-loaded-list")).toBeInTheDocument();
    expect(screen.queryByTestId("ok-loaded-settings")).not.toBeInTheDocument();
  });

  it("ayar hatası listeyi ÖLDÜRMEZ — kartlar yaşamaya devam eder", () => {
    mockInbox({});
    mockSettings(null, { isError: true, error: new BackendError(500, null) });
    renderView();
    expect(screen.getByTestId("ok-settings-error")).toBeInTheDocument();
    expect(screen.getAllByTestId("ok-card")).toHaveLength(1);
  });

  it("kırpma bandı `items.length < total` olduğunda GÖRÜNÜR basılır", () => {
    mockInbox({ items: [item()], total: 240 });
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.getByTestId("ok-truncation")).toHaveTextContent(
      "İlk 1 kayıt gösteriliyor (toplam 240) — liste eksik.",
    );
  });

  it("kırpma yoksa bant BASILMAZ (sahte uyarı yok)", () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.queryByTestId("ok-truncation")).not.toBeInTheDocument();
  });
});

describe("ApprovalsView — devre-dışı yüzeyler ve gerekçeleri", () => {
  it(":33 'Tümünü Onayla' devre dışıdır ve gerekçesi GÖRÜNÜR", () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.getByTestId("ok-bulk-approve")).toBeDisabled();
    expect(screen.getByTestId("ok-bulk-reason")).toHaveTextContent(
      "Toplu onay henüz desteklenmiyor; her kalem kendi kartından onaylanır.",
    );
  });

  it(":71-76 ÜÇ sekme devre dışıdır ve SAYI BASMAZ; gerekçe görünür", () => {
    mockInbox({ total: 7 });
    mockSettings(THRESHOLD);
    renderView();

    expect(screen.getByTestId("ok-tab-benim")).toHaveTextContent("Benim Onayım (7)");
    for (const key of ["tumu", "onaylanan", "reddedilen"]) {
      const tab = screen.getByTestId(`ok-tab-${key}`);
      expect(tab).toHaveAttribute("aria-disabled", "true");
      expect(tab.textContent).not.toMatch(/\d/);
    }
    expect(screen.getByTestId("ok-tabs-reason")).toHaveTextContent(
      "Karar verilmiş ve başkasına düşen onaylar henüz listelenmiyor.",
    );
  });

  it("🔴 satınalma kaleminin 'Detay'ı devre dışıdır (rota YOK) ve gerekçesi görünür", () => {
    mockInbox({
      items: [
        item({
          chain_id: "chain-2",
          document_type: "purchase_request",
          document_id: "pr-2",
          net_amount: null,
        }),
      ],
    });
    mockSettings(THRESHOLD);
    renderView();

    expect(screen.getByTestId("ok-card-detail")).toBeDisabled();
    expect(screen.getByTestId("ok-card-reason")).toHaveTextContent(
      "Satın alma talebinin detay ekranı henüz yazılmadı.",
    );
    // :173 TEK kutu — net kutusu HİÇ basılmaz.
    expect(screen.queryByTestId("ok-card-net")).not.toBeInTheDocument();
    expect(screen.getByTestId("ok-card-chip")).toHaveAttribute(
      "href",
      "/satinalma/talepler/pr-2/teklifler",
    );
  });

  it("bilinmeyen evrak tipi ÇÖKMEZ; kart basılır ama onay/ret DEVRE DIŞIDIR", () => {
    mockInbox({
      items: [
        item({
          chain_id: "chain-3",
          document_type: "payroll_run" as ApprovalInboxItem["document_type"],
        }),
      ],
    });
    mockSettings(THRESHOLD);
    renderView();

    expect(screen.getByTestId("ok-card-type")).toHaveTextContent("payroll_run");
    expect(screen.getByTestId("ok-card-approve")).toBeDisabled();
    expect(screen.getByTestId("ok-card-reject")).toBeDisabled();
  });
});

describe("ApprovalsView — kart içeriği (mockup :118-148)", () => {
  it("başlık, Türkçeleştirilmiş dönem, tutarlar ve eşik rozeti basılır", () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    renderView();

    expect(screen.getByTestId("ok-card-title")).toHaveTextContent(
      "Akın İnşaat — Hakediş #47 (Betonarme)",
    );
    expect(screen.getByText("Güneşkent A-Blok · Kat 6–8 · Temmuz 2026")).toBeInTheDocument();
    expect(screen.getByTestId("ok-card-gross")).toHaveTextContent("₺1.240.000");
    expect(screen.getByTestId("ok-card-net")).toHaveTextContent("₺1.016.800");
    expect(screen.getByTestId("ok-card-threshold")).toHaveTextContent(
      ">₺500.000 — Patron Gerekli",
    );
  });

  it("🔴 fiyatsız kalem `0` DEĞİL `—` basar", () => {
    mockInbox({ items: [item({ gross_amount: null, net_amount: null })] });
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.getByTestId("ok-card-gross")).toHaveTextContent("—");
  });

  it("patron adımı YOKSA eşik rozeti basılmaz", () => {
    mockInbox({
      items: [
        item({
          current_step_no: 2,
          steps: [
            step({ step_no: 1, approval_role: "site_chief", decided_at: "2026-07-19T08:00:00Z" }),
            step({ step_no: 2, approval_role: "accounting" }),
          ],
        }),
      ],
    });
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.queryByTestId("ok-card-threshold")).not.toBeInTheDocument();
  });

  it("adım şeridi DÖRT durumu sınıfa çevirir (glif YOK)", () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    renderView();
    const states = screen.getAllByTestId("ok-step").map((node) => node.dataset.state);
    expect(states).toEqual(["decided", "decided", "current-mine"]);
    // `✓`/`●`/`○` glifleri metne SIZMAMALI (fontta kapsanmıyor).
    expect(screen.getByTestId("ok-steps").textContent ?? "").not.toMatch(/[✓✗●○→⚠ℹ]/);
  });

  it("🔴 mockup'ın karşılıksız parçaları BASILMAZ (ACİL rozeti, oluşturan ROLÜ)", () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    renderView();
    expect(screen.queryByText("ACİL")).not.toBeInTheDocument();
    expect(screen.getByTestId("ok-card-meta")).toHaveTextContent("20 Temmuz 2026 · Sercan Öztürk");
    expect(screen.getByTestId("ok-card-meta").textContent).not.toContain("(");
  });
});

describe("ApprovalsView — ret diyaloğunun ZORUNLU gerekçe kapısı", () => {
  it("🔴 gerekçe boşken HİÇBİR istek atılmaz ve düğme disabled kalır", async () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    renderView();
    await userEvent.click(screen.getByTestId("ok-card-reject"));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByTestId("ok-reject-submit");

    // SIRA ÖNEMLİ: önce ÇAĞRI SAYACI. `toBeDisabled()` önce yazılırsa kusur
    // geri geldiğinde test O satırda düşer ve asıl ölçü — isteğin ATILMAMASI —
    // hiç koşmaz (b97eaa8'de fiilen bulunan sahte-yeşil).
    await userEvent.click(submit);
    await flushMutations();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(within(dialog).getByTestId("ok-reject-required")).toBeInTheDocument();
  });

  it("🔴 yalnız boşluktan oluşan gerekçede de HİÇBİR istek atılmaz", async () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    renderView();
    await userEvent.click(screen.getByTestId("ok-card-reject"));
    const dialog = screen.getByRole("dialog");
    // "   " ÜÇ karakterdir: `!== ""` ile kurulmuş bir kapı bunu GEÇİRİRDİ.
    await userEvent.type(within(dialog).getByTestId("ok-reject-reason"), "   ");
    const submit = within(dialog).getByTestId("ok-reject-submit");

    await userEvent.click(submit);
    await flushMutations();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
  });

  it("dolu gerekçede KIRPILMIŞ `reason` ile doğru aile ucuna gider", async () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    let capturedUrl: string | undefined;
    let capturedBody: string | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const request = input as Request;
        if (String(request.url).includes("/reject")) {
          capturedUrl = request.url;
          capturedBody = await request.text();
        }
        return jsonResponse({});
      }),
    );

    renderView();
    await userEvent.click(screen.getByTestId("ok-card-reject"));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByTestId("ok-reject-reason"), "  eksik metraj  ");
    await userEvent.click(within(dialog).getByTestId("ok-reject-submit"));

    await waitFor(() => expect(capturedBody).not.toBeUndefined());
    expect(capturedUrl).toContain("/subcontractor-progress-payments/scpp-3/reject");
    expect(JSON.parse(capturedBody as string)).toEqual({ reason: "eksik metraj" });
  });

  // 🔴 Tavan TİPE GÖRE değişir (`schema.d.ts`ten ölçüldü): satınalma 2000,
  // iki hakediş ailesi 500. Tek sabit yazmak satınalma kullanıcısını 1500
  // karakterlik meşru bir gerekçeyi yazamaz hâle getirirdi.
  it("hakediş ailesinde gerekçe tavanı 500'dür", async () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    renderView();
    await userEvent.click(screen.getByTestId("ok-card-reject"));
    expect(screen.getByTestId("ok-reject-reason")).toHaveAttribute("maxlength", "500");
  });

  it("satınalma ailesinde gerekçe tavanı 2000'dir", async () => {
    mockInbox({
      items: [item({ document_type: "purchase_request", document_id: "pr-2", net_amount: null })],
    });
    mockSettings(THRESHOLD);
    renderView();
    await userEvent.click(screen.getByTestId("ok-card-reject"));
    expect(screen.getByTestId("ok-reject-reason")).toHaveAttribute("maxlength", "2000");
  });
});

describe("ApprovalsView — onay", () => {
  it("'Onayla' evrak ailesinin KENDİ ucuna GÖVDESİZ POST atar", async () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const request = input as Request;
        if (String(request.url).includes("/approve")) {
          capturedUrl = request.url;
          capturedMethod = request.method;
        }
        return jsonResponse({});
      }),
    );

    renderView();
    await userEvent.click(screen.getByTestId("ok-card-approve"));

    await waitFor(() => expect(capturedUrl).not.toBeUndefined());
    expect(capturedUrl).toContain("/subcontractor-progress-payments/scpp-3/approve");
    expect(capturedMethod).toBe("POST");
  });

  it("onay hatası GÖRÜNÜR bantla bildirilir", async () => {
    mockInbox({});
    mockSettings(THRESHOLD);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "yalnız onay bekleyen onaylanabilir" }, 409)),
    );

    renderView();
    await userEvent.click(screen.getByTestId("ok-card-approve"));

    await waitFor(() =>
      expect(screen.getByTestId("ok-action-error")).toHaveTextContent(
        "yalnız onay bekleyen onaylanabilir",
      ),
    );
  });
});
