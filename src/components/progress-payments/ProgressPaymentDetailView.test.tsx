import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressPaymentDetailView } from "./ProgressPaymentDetailView";
import {
  useProgressPayment,
  useProgressPaymentSummary,
  type ProgressPaymentDetail,
} from "@/lib/api/hooks/useProgressPayments";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProgressPayments")>()),
  useProgressPayment: vi.fn(),
  useProgressPaymentSummary: vi.fn(),
}));

function mockDetailQuery(value: Partial<ReturnType<typeof useProgressPayment>>) {
  vi.mocked(useProgressPayment).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

function mockSummaryQuery(value: Partial<ReturnType<typeof useProgressPaymentSummary>>) {
  vi.mocked(useProgressPaymentSummary).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...value,
  } as never);
}

const PAYMENT_ID = "22222222-2222-2222-2222-222222222222";
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";

const baseDetail: ProgressPaymentDetail = {
  id: PAYMENT_ID,
  project_id: PROJECT_ID,
  project_name: "Güneşkent Konut",
  sequence_no: 5,
  period_year: 2026,
  period_month: 7,
  description: "Kaba inşaat",
  status: "pending_approval",
  vat_pct: "20.00",
  advance_pct: "20.00",
  retainage_pct: "5.00",
  default_coefficient: "1.00",
  submitted_at: null,
  approved_at: null,
  approved_by: null,
  paid_at: null,
  created_by: "44444444-4444-4444-4444-444444444444",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  lines: [],
  groups: [
    {
      group_name: "Betonarme İşleri",
      contract_amount: "5920000.00",
      previous_amount: "3800000.00",
      this_amount: "640000.00",
      cumulative_amount: "4440000.00",
    },
  ],
  calculation: {
    gross: "2110000.00",
    vat: "422000.00",
    advance_deduction: "422000.00",
    retention: "105500.00",
    net: "2004500.00",
  },
  progress: {
    financial_pct: "75.00",
    physical_pct: "75.00",
    duration_pct: "62.00",
  },
  dropped_orphan_count: 0,
};

const baseSummary = {
  contract_amount: "11200000.00",
  cumulative_gross: "8400000.00",
  progress_pct: "75.00",
  advance_deduction_total: "1680000.00",
  retention_total: "420000.00",
  net_total: "6300000.00",
  payment_count: 5,
  pending_count: 1,
  remaining: "2800000.00",
};

describe("ProgressPaymentDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("yukleniyor durumunu basar", () => {
    mockDetailQuery({ isLoading: true });
    mockSummaryQuery({});
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    mockDetailQuery({ isError: true, error: new Error("patladi") });
    mockSummaryQuery({});
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Hakediş yüklenemedi")).toBeInTheDocument();
  });

  it("403'te erisim reddi basar", () => {
    mockDetailQuery({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    mockSummaryQuery({});
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("baslik, durum rozeti ve proje meta bilgisini basar", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("#5 — Temmuz 2026")).toBeInTheDocument();
    expect(screen.getByText("Güneşkent Konut · Kaba inşaat")).toBeInTheDocument();
    expect(screen.getByText("Onay Bekliyor")).toBeInTheDocument();
  });

  it("KPI seridini basar: bu hakedis, kumulatif, kalan", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Bu Hakediş")).toBeInTheDocument();
    expect(screen.getByText("₺ 2.110.000")).toBeInTheDocument();
    expect(screen.getByText("Toplam Hakediş")).toBeInTheDocument();
    expect(screen.getByText("₺ 8.400.000")).toBeInTheDocument();
    expect(screen.getByText("Kalan")).toBeInTheDocument();
    expect(screen.getByText("₺ 2.800.000")).toBeInTheDocument();
  });

  it("ozet null remaining tasirsa Kalan karti basilmaz", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: { ...baseSummary, remaining: null }, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByText("Kalan")).not.toBeInTheDocument();
  });

  it("ozet sorgusu hata verirse sayfa kirilmaz, yalniz ozet KPI'lari basilmaz", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ isError: true, isSuccess: false, error: new Error("patladi") });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Bu Hakediş")).toBeInTheDocument();
    expect(screen.queryByText("Toplam Hakediş")).not.toBeInTheDocument();
    expect(screen.queryByText("Kalan")).not.toBeInTheDocument();
    expect(screen.getByText("Hakediş Kalemleri")).toBeInTheDocument();
  });

  it("grup tablosunu basar: is kalemi/sozlesme/onceki/bu ay/toplam", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Betonarme İşleri")).toBeInTheDocument();
    expect(screen.getByText("5.920.000")).toBeInTheDocument();
    expect(screen.getByText("3.800.000")).toBeInTheDocument();
    expect(screen.getByText("640.000")).toBeInTheDocument();
    expect(screen.getByText("4.440.000")).toBeInTheDocument();
  });

  it("group_name null ise hucreyi bos birakir, uydurma baslik yazmaz", () => {
    mockDetailQuery({
      data: { ...baseDetail, groups: [{ ...baseDetail.groups[0], group_name: null }] },
    });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByText("Gruplanmamış")).not.toBeInTheDocument();
  });

  it("Ara Toplam satirini basmaz (semada grup toplami alani yok)", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByText("Ara Toplam")).not.toBeInTheDocument();
  });

  it("Odeme Hesabi kartini oranlarla basar", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Ödeme Hesabı")).toBeInTheDocument();
    expect(screen.getByText("Brüt Hakediş")).toBeInTheDocument();
    expect(screen.getByText("KDV (%20)")).toBeInTheDocument();
    expect(screen.getByText("+ 422.000")).toBeInTheDocument();
    expect(screen.getByText("Avans Kesintisi (%20)")).toBeInTheDocument();
    expect(screen.getByText("- 422.000")).toBeInTheDocument();
    expect(screen.getByText("Teminat Kesintisi (%5)")).toBeInTheDocument();
    expect(screen.getByText("- 105.500")).toBeInTheDocument();
    expect(screen.getByText("Net Tahsil")).toBeInTheDocument();
    expect(screen.getByText("₺ 2.004.500")).toBeInTheDocument();
  });

  it("Sozlesme Ilerlemesi kartini basar: finansal/fiziksel/sure", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Sözleşme İlerlemesi")).toBeInTheDocument();
    expect(screen.getByText("Finansal")).toBeInTheDocument();
    expect(screen.getByText("Fiziksel")).toBeInTheDocument();
    expect(screen.getByText("Süre")).toBeInTheDocument();
    expect(screen.getAllByText("%75")).toHaveLength(2);
    expect(screen.getByText("%62")).toBeInTheDocument();
  });

  it("progress.*_pct null olan satiri atlar, sahte %0 basmaz", () => {
    mockDetailQuery({
      data: {
        ...baseDetail,
        progress: { financial_pct: "75.00", physical_pct: null, duration_pct: null },
      },
    });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Finansal")).toBeInTheDocument();
    expect(screen.queryByText("Fiziksel")).not.toBeInTheDocument();
    expect(screen.queryByText("Süre")).not.toBeInTheDocument();
  });

  it("progress uc alani da null ise Sozlesme Ilerlemesi karti basilmaz", () => {
    mockDetailQuery({
      data: {
        ...baseDetail,
        progress: { financial_pct: null, physical_pct: null, duration_pct: null },
      },
    });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByText("Sözleşme İlerlemesi")).not.toBeInTheDocument();
  });

  it("dropped_orphan_count 0 iken uyari bandini basmaz", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByTestId("pp-detail-orphan-alert")).not.toBeInTheDocument();
  });

  it("dropped_orphan_count > 0 iken uyari bandini basar ve sayiyi metne gomer", () => {
    mockDetailQuery({ data: { ...baseDetail, dropped_orphan_count: 3 } });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByTestId("pp-detail-orphan-alert")).toHaveTextContent(
      "Sözleşmeden kaldırılan 3 kalem bu hakedişten düşürüldü.",
    );
  });

  it("PDF butonu basilmaz (backend'de uc yok)", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByRole("button", { name: /PDF/i })).not.toBeInTheDocument();
  });

  it("durum aksiyon butonlari basilmaz (sonraki task), yalniz bos alan hazir", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByRole("button", { name: /Onaya Gönder/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Onayla/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reddet/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("pp-detail-actions")).toBeInTheDocument();
    expect(screen.getByTestId("pp-detail-actions")).toBeEmptyDOMElement();
  });

  it("Kar Analizi karti basilmaz (tasoron hakedisi modulunu bekliyor)", () => {
    mockDetailQuery({ data: baseDetail });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.queryByText(/Kar Analizi/i)).not.toBeInTheDocument();
  });

  it("aciklama null ise proje adini tek basina basar", () => {
    mockDetailQuery({ data: { ...baseDetail, description: null } });
    mockSummaryQuery({ data: baseSummary, isSuccess: true });
    render(<ProgressPaymentDetailView paymentId={PAYMENT_ID} />);
    expect(screen.getByText("Güneşkent Konut")).toBeInTheDocument();
  });
});
