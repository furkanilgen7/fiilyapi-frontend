import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { EmployerItemFormModal } from "./EmployerItemFormModal";
import { EMPLOYER_ITEM_TEXT as TEXT, SUMMARY_DASH } from "./constants";
import {
  useCreateEmployerContractGroup,
  useCreateEmployerContractItem,
} from "@/lib/api/hooks/useContractMutations";
import type {
  EmployerContractDetail,
  EmployerContractItemsResponse,
} from "@/lib/api/hooks/useContract";

vi.mock("@/lib/api/hooks/useContractMutations", () => ({
  useCreateEmployerContractItem: vi.fn(),
  useCreateEmployerContractGroup: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/**
 * KAPSAM MASKESİ — "Sözleşme Durumu" paneli (223-224 sayaçları).
 *
 * 🔴 Sayaç `Number(item.remaining_quantity) === 0` ile kuruluyordu. Maskeli
 * metrajda (`finance` kapsamı) `Number(null)` **0**'dır: TÜM pozlar
 * "dağıtılmış" sayılıyor, "dağıtılmamış" sayacı da `uzunluk - hepsi` = **0**
 * basıyordu. İki sayaç da SAHTEydi ve ikisi de canlı renkle (`--ok` / `--warn`)
 * gerçek sayı gibi gösteriliyordu.
 *
 * Doğru cevap 0 DEĞİL "—"dir: kalan metraj görünmeden kaç pozun dağıtıldığı
 * BİLİNEMEZ. `isRemainingSettled` ile sayıp maskeliyi "dağıtılmamış" saymak da
 * yanlış olurdu — o da uydurma bir sayı üretirdi (bu sefer ters yönde).
 */

const PROJECT_ID = "pppppppp-0000-0000-0000-000000000001";
const GROUP_ID = "gggggggg-0000-0000-0000-000000000002";

const DETAIL = {
  project_id: PROJECT_ID,
  amount: "22400000.00",
  has_price_escalation: false,
  index_type: null,
} as EmployerContractDetail;

function groupsWith(remaining: (string | null)[]): EmployerContractItemsResponse["groups"] {
  return [
    {
      id: GROUP_ID,
      name: "B — Betonarme İşleri",
      sort_order: 20,
      items: remaining.map((value, index) => ({
        id: `iiiiiiii-0000-0000-0000-00000000000${index + 1}`,
        group_id: GROUP_ID,
        code: `03.01${index}`,
        description: "Grobeton",
        unit: "m³",
        quantity: "100.000",
        unit_price: "1200.00",
        sort_order: (index + 1) * 10,
        distributed_quantity: "40.000",
        remaining_quantity: value,
      })),
    },
  ] as EmployerContractItemsResponse["groups"];
}

function renderModal(remaining: (string | null)[]) {
  return render(
    <EmployerItemFormModal
      projectId={PROJECT_ID}
      groups={groupsWith(remaining)}
      detail={DETAIL}
      onClose={vi.fn()}
    />,
  );
}

/** Etiketi verilen istatistik satırının DEĞER hücresi. */
function statValue(label: string): HTMLElement {
  const row = screen.getByText(label).closest(".pif-stats__row");
  if (!row) throw new Error(`"${label}" satırı bulunamadı`);
  const value = row.querySelector(".pif-stats__value:not(.pif-stats__label)");
  const cells = row.querySelectorAll("span");
  return (value as HTMLElement) ?? (cells[cells.length - 1] as HTMLElement);
}

/**
 * 🔴 `render()`in `container`ı DEĞİL `document` sorgulanır: `Modal` içeriği bir
 * PORTAL'a basar, yani `container` BOŞtur ve ondan yapılan her "bulunmadı"
 * iddiası SAHTE-YEŞİLdir (ölçüldü: pozitif kontrol de `null` döndü).
 */
function toneClass(modifier: string): Element | null {
  return document.body.querySelector(`.pif-stats__value--${modifier}`);
}

beforeEach(() => {
  vi.mocked(useCreateEmployerContractItem).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateEmployerContractItem>);
  vi.mocked(useCreateEmployerContractGroup).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateEmployerContractGroup>);
});

describe("EmployerItemFormModal 'Sözleşme Durumu' — maskeli metrajda sayaç UYDURMAZ", () => {
  it("🔴 tek bir poz bile maskeliyken İKİ sayaç da '—' basar", () => {
    renderModal(["0.000", null, "60.000"]);
    expect(statValue(TEXT.contractDistributedCount)).toHaveTextContent(SUMMARY_DASH);
    expect(statValue(TEXT.contractUndistributedCount)).toHaveTextContent(SUMMARY_DASH);
    // Poz SAYISI maskelenmez (kimlik kovası) — o hâlâ gerçektir.
    expect(statValue(TEXT.contractItemCount)).toHaveTextContent("3");
  });

  it("🔴 maskeli hâlde canlı ton sınıfları (--ok / --warn) BASILMAZ", () => {
    renderModal([null]);
    expect(toneClass("ok")).toBeNull();
    expect(toneClass("warn")).toBeNull();
  });

  it("🔴 POZİTİF KONTROL — metraj görünürken sayaçlar gerçek değeri basar", () => {
    renderModal(["0.000", "60.000", "0.000"]);
    expect(statValue(TEXT.contractDistributedCount)).toHaveTextContent("2");
    expect(statValue(TEXT.contractUndistributedCount)).toHaveTextContent("1");
    expect(toneClass("ok")).not.toBeNull();
    expect(toneClass("warn")).not.toBeNull();
  });
});
