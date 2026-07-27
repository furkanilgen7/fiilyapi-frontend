import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppearanceScreen } from "./AppearanceScreen";

const PREFERENCES = {
  theme: "light",
  locale: "tr",
  currency: "TRY",
  date_format: "DD.MM.YYYY",
  density: "normal",
  accent_color: "#2563eb",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function stubFetch(response: () => Response) {
  vi.stubGlobal("fetch", vi.fn(async () => response()));
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppearanceScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppearanceScreen", () => {
  it("dil/para/tarih seciciierini Select primitive'i ile render eder", async () => {
    stubFetch(() => json(PREFERENCES));

    renderScreen();

    const locale = await screen.findByLabelText("Arayüz Dili");
    const currency = screen.getByLabelText("Para Birimi");
    const dateFormat = screen.getByLabelText("Tarih Formatı");

    for (const control of [locale, currency, dateFormat]) {
      expect(control.tagName).toBe("SELECT");
      // Primitive stili: ham <select> degil, token tabanli .select sinifi.
      expect(control.className).toContain("select");
      expect(control.parentElement?.className).toContain("select-wrap");
    }
  });

  it("secim degisikligini forma yansitir", async () => {
    stubFetch(() => json(PREFERENCES));

    renderScreen();

    const currency = await screen.findByLabelText("Para Birimi");
    expect(currency).toHaveValue("TRY");

    await userEvent.selectOptions(currency, "USD");

    await waitFor(() => expect(currency).toHaveValue("USD"));
  });
});
