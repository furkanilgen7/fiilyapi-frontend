import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { LeaveRequestResponse } from "@/lib/api/hooks/useLeaves";

import { DECISION_PENDING_REASON } from "./leaves-labels";
import { PendingLeaveRequestsTable } from "./PendingLeaveRequestsTable";

/**
 * T3'ün "geri çağrı bağlı DEĞİLKEN" dalı — T4'te `LeavesView` akışı bağladığı
 * için o ekrandan artık ölçülemez, ama dal CANLIdır (tablo sunumsaldır ve
 * başka bir kap onu bağlamadan kullanabilir).
 *
 * 🔴 GÖRÜNÜR GEREKÇE canon'u: gerekçe metni öğenin KENDİ durumundan türetilir.
 * Bu test o türetmenin iki ucunu da (bağlı/bağsız) `LeavesView.test.tsx`teki
 * ikiziyle birlikte kilitler.
 */
const ROWS: LeaveRequestResponse[] = [
  {
    id: "lr-1",
    personnel_id: "per-1",
    personnel_name: "Ayşe Demir",
    personnel_trade: "Büro Şefi",
    leave_type_id: "lt-1",
    leave_type_name: "Yıllık",
    leave_type_color: null,
    deducts_from_annual: true,
    start_date: "2026-08-04",
    end_date: "2026-08-08",
    days: 5,
    note: null,
    document_id: null,
    status: "pending",
    decided_by: null,
    decided_at: null,
    reject_reason: null,
    created_at: "2026-07-20T09:00:00Z",
    updated_at: "2026-07-20T09:00:00Z",
  },
];

describe("PendingLeaveRequestsTable — karar geri çağrıları bağlı DEĞİLKEN", () => {
  it("düğmeler devre-dışıdır ve gerekçe EKRANDA yazar", () => {
    render(
      <PendingLeaveRequestsTable
        rows={ROWS}
        total={1}
        balances={undefined}
        isLoading={false}
      />,
    );

    expect(screen.getByTestId("iz-approve-lr-1")).toBeDisabled();
    expect(screen.getByTestId("iz-reject-lr-1")).toBeDisabled();
    expect(screen.getByTestId("iz-decision-reason")).toHaveTextContent(DECISION_PENDING_REASON);
  });

  it("geri çağrılar bağlanınca gerekçe KENDİLİĞİNDEN kalkar", () => {
    render(
      <PendingLeaveRequestsTable
        rows={ROWS}
        total={1}
        balances={undefined}
        isLoading={false}
        onApproveRequest={() => undefined}
        onRejectRequest={() => undefined}
      />,
    );

    expect(screen.queryByTestId("iz-decision-reason")).not.toBeInTheDocument();
    expect(screen.getByTestId("iz-approve-lr-1")).toBeEnabled();
  });
});
