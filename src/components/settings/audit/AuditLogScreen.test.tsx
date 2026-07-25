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
    occurred_at: "2026-07-17T09:14:00",
    action: "login",
    detail: "Sisteme giriş yapıldı",
    ip_address: "192.168.1.100",
    actor: { id: "u1", full_name: "Ahmet Yılmaz", role_name: "Patron" },
  },
  {
    id: "a2",
    occurred_at: "2026-07-15T09:00:00",
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

  it("sonraki sayfada offset'i sayfa boyutu kadar ilerletir", async () => {
    const calls = stubFetch(() => json({ items: ITEMS, total: 120, limit: 50, offset: 0 }));

    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "Sonraki" }));

    await waitFor(() => expect(calls.some((url) => url.includes("offset=50"))).toBe(true));
    expect(screen.getByText("Sayfa 2 / 3")).toBeInTheDocument();
  });
});
