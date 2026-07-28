import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyScreen } from "./CompanyScreen";

const COMPANY = {
  id: "c1",
  name: "FİİL Yapı",
  tax_number: "1234567890",
  tax_office: "Kadıköy",
  trade_registry_no: "12345",
  kep_address: "fiil@hs01.kep.tr",
  phone: "0216 000 00 00",
  email: "info@fiilyapi.com",
  website: "https://fiilyapi.com",
  address: "İstanbul",
  brand_color: "#2563eb",
  gib_integration_code: "GIB-1",
  earsiv_portal: "Logo e-Fatura",
  default_vat_rate: "20",
  auto_einvoice: false,
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
      <CompanyScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CompanyScreen", () => {
  it("e-Arsiv ve KDV seciciierini Select primitive'i ile render eder", async () => {
    stubFetch(() => json(COMPANY));

    renderScreen();

    const portal = await screen.findByLabelText("e-Arşiv Portalı");
    const vat = screen.getByLabelText("KDV Oranı (Varsayılan)");

    for (const control of [portal, vat]) {
      expect(control.tagName).toBe("SELECT");
      expect(control.className).toContain("select");
      expect(control.parentElement?.className).toContain("select-wrap");
    }
  });

  it("KDV orani secimini forma yansitir", async () => {
    stubFetch(() => json(COMPANY));

    renderScreen();

    const vat = await screen.findByLabelText("KDV Oranı (Varsayılan)");
    expect(vat).toHaveValue("20");

    await userEvent.selectOptions(vat, "10");

    await waitFor(() => expect(vat).toHaveValue("10"));
  });
});
