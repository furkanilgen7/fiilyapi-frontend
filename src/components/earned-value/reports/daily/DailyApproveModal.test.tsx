import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { useApproveDailyReport } from "@/lib/api/hooks/useEvReports";

import { DailyApproveModal } from "./DailyApproveModal";

/**
 * F3.6b lider denetimi (5. tur) — onay modalı uyarı bandı GİR:389-402 ile
 * karşılaştırıldı: tarih listesi `joinWithVe` (ekranla AYNI, madde 15) +
 * ikinci cümle ("N a-s dağıtılmamış saat gerekçesiyle kayda geçer.")
 * `footer.undistributed_day > 0` iken EKLENİR (önceden hiç basılmıyordu).
 */
function approveStub(): ReturnType<typeof useApproveDailyReport> {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as unknown as ReturnType<typeof useApproveDailyReport>;
}

describe("DailyApproveModal — uyarı bandı (GİR:389-402)", () => {
  it("iki eksik günlük tarihi 've' bağlacıyla basılır (virgül DEĞİL)", () => {
    render(
      <DailyApproveModal
        reportDate="2026-09-26"
        missingDiaryDates={["2026-09-21", "2026-09-23"]}
        undistributedDay={null}
        approve={approveStub()}
        onClose={() => {}}
        onApproved={() => {}}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent("21.09 ve 23.09 günlükleri hiç gönderilmedi");
  });

  it("undistributed_day > 0 iken ikinci cümle EKLENİR, miktar formatlanır", () => {
    render(
      <DailyApproveModal
        reportDate="2026-09-26"
        missingDiaryDates={["2026-09-21"]}
        undistributedDay="16"
        approve={approveStub()}
        onClose={() => {}}
        onApproved={() => {}}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent("16 a-s dağıtılmamış saat gerekçesiyle kayda geçer.");
  });

  it("undistributed_day '0' iken ikinci cümle YOK", () => {
    render(
      <DailyApproveModal
        reportDate="2026-09-26"
        missingDiaryDates={["2026-09-21"]}
        undistributedDay="0"
        approve={approveStub()}
        onClose={() => {}}
        onApproved={() => {}}
      />,
    );
    expect(screen.getByRole("note")).not.toHaveTextContent("dağıtılmamış saat gerekçesiyle");
  });

  it("undistributed_day null iken ikinci cümle YOK, çökme yok", () => {
    render(
      <DailyApproveModal
        reportDate="2026-09-26"
        missingDiaryDates={["2026-09-21"]}
        undistributedDay={null}
        approve={approveStub()}
        onClose={() => {}}
        onApproved={() => {}}
      />,
    );
    expect(screen.getByRole("note")).not.toHaveTextContent("dağıtılmamış saat gerekçesiyle");
  });

  it("missingDiaryDates boşsa uyarı bandı hiç basılmaz", () => {
    render(
      <DailyApproveModal
        reportDate="2026-09-26"
        missingDiaryDates={[]}
        undistributedDay="16"
        approve={approveStub()}
        onClose={() => {}}
        onApproved={() => {}}
      />,
    );
    expect(screen.queryByRole("note")).toBeNull();
  });
});
