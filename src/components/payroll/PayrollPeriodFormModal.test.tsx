import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PayrollPeriodListRow } from "@/lib/api/hooks/usePayroll";
import { useCreatePayrollPeriod } from "@/lib/api/hooks/usePayrollMutations";

import { PayrollPeriodFormModal } from "./PayrollPeriodFormModal";

vi.mock("@/lib/api/hooks/usePayrollMutations", () => ({
  useCreatePayrollPeriod: vi.fn(),
}));

/**
 * F-BORDRO T2 · "Dönem Aç" diyaloğu.
 *
 * 🔴 Bu testin ASIL İŞİ **gövdeyi uçtan ölçülen şemaya sabitlemektir**
 * (`PayrollPeriodCreate`: `year` · `month` · opsiyonel `payment_due_date`;
 * `extra="forbid"`). Şema `forbid` olduğu için fazladan TEK bir alan bile
 * 422 üretir ve bu YALNIZ canlıda görülürdü — jsdom'da gövdeyi iddia etmek
 * o sınıfı buraya taşır.
 */

function periodRow(year: number, month: number): PayrollPeriodListRow {
  return {
    id: `pp-${year}-${String(month).padStart(2, "0")}`,
    year,
    month,
    status: "draft",
    payment_due_date: null,
    paid_at: null,
    personnel_count: 0,
    gross_total: "0.00",
    sgk_employer_total: "0.00",
    net_total: "0.00",
    total_cost: "0.00",
  } as unknown as PayrollPeriodListRow;
}

const mutateAsync = vi.fn();
const onClose = vi.fn();
const onCreated = vi.fn();

function setMutation(partial: Record<string, unknown> = {}) {
  vi.mocked(useCreatePayrollPeriod).mockReturnValue({
    isPending: false,
    mutateAsync,
    ...partial,
  } as unknown as ReturnType<typeof useCreatePayrollPeriod>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({ id: "pp-2026-08" });
  setMutation();
});

const ROWS = [periodRow(2026, 6), periodRow(2026, 7)];

function renderModal(rows: readonly PayrollPeriodListRow[] = ROWS) {
  return render(
    <PayrollPeriodFormModal rows={rows} onClose={onClose} onCreated={onCreated} />,
  );
}

describe("PayrollPeriodFormModal · açılış değerleri", () => {
  it("en yeni dönemin BİR SONRAKİ ayını önerir", () => {
    renderModal();
    expect(screen.getByTestId("bordro-open-year")).toHaveValue(2026);
    expect(screen.getByTestId("bordro-open-month")).toHaveValue("8");
  });

  it("hiç dönem yoksa alanlar BOŞ açılır (uydurma yıl basılmaz)", () => {
    renderModal([]);
    expect(screen.getByTestId("bordro-open-year")).toHaveValue(null);
    expect(screen.getByTestId("bordro-open-month")).toHaveValue("");
    // Kapı kapalı ve gerekçe GÖRÜNÜR.
    expect(screen.getByTestId("bordro-open-submit")).toBeDisabled();
    expect(screen.getByTestId("bordro-open-block-reason")).toHaveTextContent("Yıl girin.");
  });

  it("son ödeme tarihi OPSİYONELDİR — boş açılır ve kapıyı kapatmaz", () => {
    renderModal();
    expect(screen.getByTestId("bordro-open-due")).toHaveValue("");
    expect(screen.getByTestId("bordro-open-submit")).toBeEnabled();
  });
});

describe("PayrollPeriodFormModal · gövde uçtan ölçülen şemaya uyar", () => {
  it("tarih girilmezse `payment_due_date` gövdeye HİÇ eklenmez", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByTestId("bordro-open-submit"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    // 🔴 TAM KÜME iddiası: `toMatchObject` değil `toEqual` — fazladan bir alan
    // (örn. `status`) sızsaydı `extra="forbid"` yüzünden canlıda 422 olurdu.
    expect(mutateAsync).toHaveBeenCalledWith({ year: 2026, month: 8 });
  });

  it("tarih girilirse ISO olarak gövdeye girer", async () => {
    const user = userEvent.setup();
    renderModal();

    // `DateInput` TR yazar, ISO taşır — dönüşüm primitive'in sözleşmesidir.
    await user.type(screen.getByTestId("bordro-open-due"), "05.09.2026");
    await user.click(screen.getByTestId("bordro-open-submit"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      year: 2026,
      month: 8,
      payment_due_date: "2026-09-05",
    });
  });

  it("başarıda açılan dönem ÇAĞIRANA bildirilir ve diyalog kapanır", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByTestId("bordro-open-submit"));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("pp-2026-08"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("PayrollPeriodFormModal · kapı ve hata", () => {
  it("zaten açılmış ay gönderilmeden ÖNCE elenir", async () => {
    const user = userEvent.setup();
    renderModal();

    // Temmuz 2026 zaten açık.
    await user.selectOptions(screen.getByTestId("bordro-open-month"), "7");

    expect(screen.getByTestId("bordro-open-block-reason")).toHaveTextContent(
      "zaten açılmış",
    );
    expect(screen.getByTestId("bordro-open-submit")).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("sunucu hatası SESSİZCE YUTULMAZ; diyalog AÇIK kalır", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error("Bu dönem zaten açılmış."));
    renderModal();

    await user.click(screen.getByTestId("bordro-open-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("bordro-open-error")).toBeInTheDocument(),
    );
    // 🔴 Hata hâlinde kapanmak, kullanıcının yazdıklarını sessizce ÇÖPE atardı.
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("gönderim sürerken alanlar ve düğmeler KİLİTLİDİR (tek uçuş)", () => {
    setMutation({ isPending: true });
    renderModal();

    expect(screen.getByTestId("bordro-open-submit")).toBeDisabled();
    expect(screen.getByTestId("bordro-open-month")).toBeDisabled();
    expect(screen.getByTestId("bordro-open-year")).toBeDisabled();
  });
});
