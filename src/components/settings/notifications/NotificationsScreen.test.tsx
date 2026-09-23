import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationsScreen } from "./NotificationsScreen";

const PREFS = [{ event_key: "progress_payment_created", label: "Hakediş oluşturuldu", email: true, in_app: true, sms: false }];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NotificationsScreen", () => {
  it("kaydetme basarisiz olunca hata metni gosterir", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: Request) => {
      if (input.method === "PUT") return json({ detail: "Kaydedilemedi" }, 500);
      return json(PREFS);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await screen.findByText("Yeni hakediş talebi");

    await user.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(screen.getByText(/kaydedile?medi|hata/i)).toBeInTheDocument();
    });
  });
});
