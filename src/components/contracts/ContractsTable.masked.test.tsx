import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContractsTable } from "./ContractsTable";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { ContractListItem } from "@/lib/api/hooks/useContracts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/**
 * KAPSAM MASKESİ — SZL 60 "İlerleme" hücresi.
 *
 * 🔴 `progress_pct` `Gorunurluk.operasyonel` etiketlidir ve `finance` kapsamlı
 * rolde `null` gelir. Hücre `null`u TEK anlamla okuyup SABİT bir gerekçe
 * yazıyordu: *"Sözleşme bedeli girilmemiş — ilerleme oranı hesaplanamaz"*.
 * Bedel EKRANDA GÖRÜNÜRKEN bu cümle YALANDIR.
 *
 * Deponun kendi kanonu (`projects/schemas.py::restricted` docstring'i):
 * *"'bu modül daha yazılmadı' ile 'bunu görmeye yetkin yok' FARKLI iki
 * durumdur ve ilkini ikincisi için kullanmak ekranı YALANCI yapar."*
 *
 * Ayrım ŞEMADA yok (`progress_pct` düz `Decimal | None`, `MetricPlaceholder`
 * zarfı DEĞİL) — ama satırın KENDİ `amount` alanından ÖLÇÜLEBİLİR:
 * backend `progress_pct`i yalnız payda yok/sıfırken `None` bırakır
 * (`progress_payments/summary.py`). Yani gerekçe ancak `amount` GÖRÜNÜR ve
 * `<= 0` iken kanıtlıdır; diğer hâllerde sebep bilinmez ve
 * `placeholder-cell.ts`in 3. hâli uygulanır: "—", ipucu VERİLMEZ.
 */

const REASON = pendingModuleLabel("subcontractor_progress_pct");

function item(overrides: Partial<ContractListItem> = {}): ContractListItem {
  return {
    id: "cccccccc-0000-0000-0000-000000000001",
    title: "Kule A — Kaba İnşaat",
    contract_no: "SZL-2025-01",
    counterparty_name: "Güneşkent A.Ş.",
    amount: "1000000.00",
    start_date: "2025-03-01",
    end_date: "2026-12-01",
    progress_pct: "42.50",
    status: "active",
    ...overrides,
  } as ContractListItem;
}

function renderRow(overrides: Partial<ContractListItem> = {}) {
  return render(
    <ContractsTable type="employer" isError={false} isLoading={false} items={[item(overrides)]} />,
  );
}

describe("ContractsTable ProgressCell — uydurma gerekçe basmaz", () => {
  it("🔴 bedel GÖRÜNÜR ve pozitifken null ilerleme: '—' basar, 'bedel girilmemiş' DEMEZ", () => {
    renderRow({ progress_pct: null, amount: "1000000.00" });
    const cell = screen.getByTestId("szl-progress-pending");
    expect(cell).toHaveTextContent("—");
    expect(cell.textContent).not.toContain(REASON);
    expect(cell).not.toHaveAttribute("title");
  });

  it("🔴 bedel de maskeliyken (null) sebep BİLİNEMEZ — gerekçe basılmaz", () => {
    renderRow({ progress_pct: null, amount: null });
    const cell = screen.getByTestId("szl-progress-pending");
    expect(cell).toHaveTextContent("—");
    expect(cell.textContent).not.toContain(REASON);
    expect(cell).not.toHaveAttribute("title");
  });

  it("🔴 POZİTİF KONTROL — bedel GÖRÜNÜR ve 0 iken gerekçe KANITLIDIR, basılır", () => {
    renderRow({ progress_pct: null, amount: "0.00" });
    const cell = screen.getByTestId("szl-progress-pending");
    expect(cell).toHaveAttribute("title", REASON);
    expect(cell.textContent).toContain(REASON);
  });

  it("🔴 POZİTİF KONTROL — gerçek yüzde çubuğu bozulmadan basılır", () => {
    renderRow({ progress_pct: "42.50", amount: "1000000.00" });
    expect(screen.getByTestId("szl-progress")).toHaveTextContent("%42,5");
    expect(screen.queryByTestId("szl-progress-pending")).toBeNull();
  });
});
