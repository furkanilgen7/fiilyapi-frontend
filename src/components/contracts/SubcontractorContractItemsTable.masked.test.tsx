import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SubcontractorContractItemsTable } from "./SubcontractorContractItemsTable";
import type { SubcontractorContractItemResponse } from "@/lib/api/hooks/useSubcontractorContractMutations";

/**
 * KAPSAM MASKESİ — TSD 117-120 "Hakediş %" hücresi.
 *
 * 🔴 `quantity` `finance` kapsamında `null`dır; oran hesaplanamaz ve hücre
 * pending dalına düşer. O dal SABİT bir gerekçe yazıyordu: *"Hakediş listesi
 * eksik olduğu için ilerleme yüzdesi hesaplanamıyor"*. Hakediş listesi PEKÂLÂ
 * tam olabilir — eksik olan METRAJDIR ve o da eksik değil GİZLİdir. Cümle
 * yanlış bir sebep iddia ediyordu.
 *
 * Canon `placeholder-cell.ts` 3. hâli: sebep bilinmiyorsa "—" basılır, ipucu
 * VERİLMEZ. Burada sebep ÖLÇÜLEBİLİR (`quantity === null` ⇒ maske), bu yüzden
 * hücre o hâlde gerekçeyi bastırır.
 */

function item(
  overrides: Partial<SubcontractorContractItemResponse> & { id: string },
): SubcontractorContractItemResponse {
  return {
    contract_id: "sc-1",
    source_contract_item_id: null,
    code: "03.001",
    description: "Grobeton",
    unit: "m³",
    quantity: "100.000",
    unit_price: "1200.00",
    sort_order: 0,
    group: null,
    line_total: "120000.00",
    ...overrides,
  } as SubcontractorContractItemResponse;
}

const REASON = "Hakediş listesi eksik olduğu için ilerleme yüzdesi hesaplanamıyor";

function renderTable(
  itemOverrides: Partial<SubcontractorContractItemResponse>,
  progressPctByItemId: Map<string, number> | null,
) {
  return render(
    <SubcontractorContractItemsTable
      items={[item({ id: "it-1", ...itemOverrides })]}
      contractTotal="120000.00"
      itemsMissingPrice={0}
      employerContractNo={null}
      progressPctByItemId={progressPctByItemId}
      progressPendingReason={REASON}
      isBusy={false}
      errorMessage={null}
      onCommitUnitPrice={vi.fn()}
      onAddItem={vi.fn()}
    />,
  );
}

describe("SubcontractorContractItemsTable 'Hakediş %' — maskeli metrajda yanlış sebep yazmaz", () => {
  it("🔴 metraj maskeliyken (null) '—' basar ama 'hakediş listesi eksik' DEMEZ", () => {
    renderTable({ quantity: null }, new Map());
    const cell = screen.getByTestId("tsd-progress-03.001");
    expect(cell).toHaveTextContent("—");
    expect(cell.textContent).not.toContain(REASON);
    expect(cell.querySelector("[title]")).toBeNull();
  });

  it("🔴 POZİTİF KONTROL — metraj GÖRÜNÜRken hakediş listesi gelmediyse gerekçe basılır", () => {
    renderTable({ quantity: "100.000" }, null);
    const cell = screen.getByTestId("tsd-progress-03.001");
    expect(cell.textContent).toContain(REASON);
  });

  it("🔴 POZİTİF KONTROL — oran hesaplanabiliyorsa yüzde basılır", () => {
    renderTable({ quantity: "100.000" }, new Map([["it-1", 40]]));
    const cell = screen.getByTestId("tsd-progress-03.001");
    expect(cell).toHaveTextContent("%40");
    expect(cell.textContent).not.toContain(REASON);
  });

  it("no 54 · ondalıklı oran `formatPercent`in yuvarlama kuralıyla basılır (tam sayıya YUVARLANMAZ)", () => {
    renderTable({ quantity: "100.000" }, new Map([["it-1", 42.5]]));
    const cell = screen.getByTestId("tsd-progress-03.001");
    expect(cell).toHaveTextContent("%42,5");
  });
});
