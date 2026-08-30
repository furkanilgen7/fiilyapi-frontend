import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditLogScreen } from "./AuditLogScreen";

const USERS = {
  items: [{ id: "u1", email: "a@b.com", full_name: "Ahmet Yılmaz", title: "Patron", role_id: "r1", status: "active" }],
  total: 1,
  limit: 200,
  offset: 0,
};

const ITEMS = [
  {
    id: "a1",
    // UTC saklanır; ekranda TR saatiyle (09:14) görünür.
    occurred_at: "2026-07-17T06:14:00Z",
    action: "login",
    detail: "Sisteme giriş yapıldı",
    ip_address: "192.168.1.100",
    actor: { id: "u1", full_name: "Ahmet Yılmaz", role_name: "Patron" },
  },
  {
    id: "a2",
    occurred_at: "2026-07-15T06:00:00Z",
    action: "backup",
    detail: "Otomatik yedekleme tamamlandı · 2,3 GB",
    ip_address: null,
    actor: null,
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Denetim isteklerinin URL'lerini toplayan fetch mock'u.
function stubFetch(auditResponse: (url: string) => Response) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/backend/audit-log")) {
        calls.push(url);
        return auditResponse(url);
      }
      return json(USERS);
    }),
  );
  return calls;
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuditLogScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuditLogScreen", () => {
  it("kayıtları mockup biçimiyle listeler; aktörsüz satır Sistem, IP'siz satır tire gösterir", async () => {
    stubFetch(() => json({ items: ITEMS, total: 2, limit: 50, offset: 0 }));

    renderScreen();

    expect(await screen.findByText("Sisteme giriş yapıldı")).toBeInTheDocument();
    expect(screen.getByText("17.07 09:14")).toBeInTheDocument();
    expect(screen.getByText("Sistem")).toBeInTheDocument();
    expect(screen.getByText("Otomatik")).toBeInTheDocument();
    expect(screen.getByText("Yedekleme")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("filtre seçicilerini Select primitive'i ile render eder", async () => {
    stubFetch(() => json({ items: [], total: 0, limit: 50, offset: 0 }));

    renderScreen();

    const labels = ["Kullanıcı filtresi", "İşlem filtresi", "Tarih aralığı"];
    for (const label of labels) {
      const control = await screen.findByLabelText(label);
      expect(control.tagName).toBe("SELECT");
      // Ham <select> degil, token tabanli .select primitive'i kullanilir.
      expect(control.className).toContain("select");
      expect(control.parentElement?.className).toContain("select-wrap");
    }
  });

  // 🔴 AI-0b — `ACTION_OPTIONS` bir ALT KÜMEDIR ve tipi `ReadonlyArray<AuditAction>`
  // oldugu icin backend enum'una uye eklemek onu KIRMAZ (`tsc` sessiz kalir).
  // `AUDIT_ACTION_LABEL` ise `Record<AuditAction, string>`tir ve KIRAR — yani
  // devirde etiket zorunlu, filtre listesi ISTEGE BAGLIDIR. Bu ayrim olculdu ve
  // burada ACIK KUME iddiasiyla kayda geciriliyor: liste sessizce genisleyemez
  // ya da daralamaz.
  it("işlem filtresi TAM OLARAK beş işlem + 'Tüm İşlemler' gösterir (bilinçli alt küme)", async () => {
    stubFetch(() => json({ items: [], total: 0, limit: 50, offset: 0 }));

    renderScreen();

    const select = await screen.findByLabelText("İşlem filtresi");
    const secenekler = [...select.querySelectorAll("option")].map((o) => o.textContent);
    expect(secenekler).toEqual(["Tüm İşlemler", "Giriş", "Oluşturma", "Güncelleme", "Silme", "Onay"]);
    // `backup` ve `ai_turn` BILEREK disarida: ikisinin de henuz uretici ucu YOK,
    // listeye koymak her zaman bos donen bir filtre gostermek olurdu.
    expect(secenekler).not.toContain("Yedekleme");
    expect(secenekler).not.toContain("AI Turu");
  });

  it("403 yanıtında yetki uyarısı gösterir", async () => {
    stubFetch(() => json({ detail: "Yetkisiz işlem" }, 403));

    renderScreen();

    expect(await screen.findByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("işlem filtresi seçimini query parametresine yansıtır", async () => {
    const calls = stubFetch(() => json({ items: [], total: 0, limit: 50, offset: 0 }));

    renderScreen();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]).toContain("date_from=");
    expect(calls[0]).not.toContain("action=");

    await userEvent.selectOptions(screen.getByLabelText("İşlem filtresi"), "delete");

    await waitFor(() => expect(calls.some((url) => url.includes("action=delete"))).toBe(true));
  });

  it("kullanıcı filtresi seçimini actor_user_id parametresine yansıtır", async () => {
    const calls = stubFetch(() => json({ items: [], total: 0, limit: 50, offset: 0 }));

    renderScreen();
    expect(await screen.findByRole("option", { name: "Ahmet Yılmaz" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Kullanıcı filtresi"), "u1");

    await waitFor(() => expect(calls.some((url) => url.includes("actor_user_id=u1"))).toBe(true));
  });

  it("arama kutusunu q parametresine bağlar ve her tuş için istek atmaz", async () => {
    const calls = stubFetch(() => json({ items: [], total: 0, limit: 50, offset: 0 }));

    renderScreen();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));

    await userEvent.type(screen.getByLabelText("Kullanıcı veya işlem ara"), "abc");

    await waitFor(() => expect(calls.some((url) => url.includes("q=abc"))).toBe(true));
    // Debounce: "a" ve "ab" ara adımları için ayrı istek çıkmaz.
    expect(calls.filter((url) => url.includes("q=")).length).toBe(1);
  });

  it("yalnızca boşluktan oluşan aramada q göndermez", async () => {
    const calls = stubFetch(() => json({ items: [], total: 0, limit: 50, offset: 0 }));

    renderScreen();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const callsBefore = calls.length;

    await userEvent.type(screen.getByLabelText("Kullanıcı veya işlem ara"), "   ");

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(calls.some((url) => url.includes("q="))).toBe(false);
    expect(calls.length).toBe(callsBefore);
  });

  it("sonraki sayfada offset'i sayfa boyutu kadar ilerletir", async () => {
    const calls = stubFetch(() => json({ items: ITEMS, total: 120, limit: 50, offset: 0 }));

    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "Sonraki" }));

    await waitFor(() => expect(calls.some((url) => url.includes("offset=50"))).toBe(true));
    expect(screen.getByText("Sayfa 2 / 3")).toBeInTheDocument();
  });
});
