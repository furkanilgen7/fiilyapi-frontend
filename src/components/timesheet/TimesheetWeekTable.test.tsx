import { useState } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimesheetWeekTable } from "./TimesheetWeekTable";
import type { TimesheetWeekDayColumn, TimesheetWeekViewRow } from "./week-derive";

const DAY: TimesheetWeekDayColumn = {
  workDate: "2026-08-03",
  weekday: "Pzt",
  dayMonth: "3 Ağu",
  isSaturday: false,
  isSunday: false,
  totalHours: "9",
  workedDayCount: 1,
  leaveCount: 0,
  temporaryDutyCount: 0,
};

function row(hours: string | null): TimesheetWeekViewRow {
  return {
    personnelId: "p-1",
    fullName: "Ahmet Yılmaz",
    trade: "Kalıpçı",
    source: "company",
    subcontractorName: null,
    cells: {
      "2026-08-03": { hours, code: null, sectionId: null },
    },
    totalHours: hours ?? "0",
    normalHours: hours,
    overtimeHours: "0",
    isStale: false,
  };
}

/**
 * 🔴 triyaj #352/#353 — `WeekCell`'in `text` state'i yalnız ilk render'da
 * kurulurdu; hücre remount olmadan sunucu/taslak saati değişince BAYAT
 * kalıyordu ve Enter yolu bu bayat metni yazıyordu. Ayrıca `onBlur`
 * koşulsuz `commit` çağırıyordu — değer değişmese bile draft'a yazıp
 * `dirtyKeys`i şişiriyordu.
 */
describe("TimesheetWeekTable · WeekCell saat senkronu (triyaj #352/#353)", () => {
  function Harness({
    initialHours,
    onCommitHours,
  }: {
    initialHours: string | null;
    onCommitHours: (personnelId: string, workDate: string, hours: string | null) => void;
  }) {
    const [hours, setHours] = useState(initialHours);
    return (
      <>
        <button type="button" onClick={() => setHours("12.00")}>
          Dışarıdan güncelle (12)
        </button>
        <TimesheetWeekTable
          days={[DAY]}
          rows={[row(hours)]}
          normalDayHours="9"
          totalHours={hours ?? "0"}
          normalHours={hours ?? "0"}
          overtimeHours="0"
          isStale={false}
          canWrite={true}
          dirtyKeys={new Set()}
          onCommitHours={onCommitHours}
          onCommitCode={vi.fn()}
        />
      </>
    );
  }

  it("hücre remount olmadan sunucu saati değişince görünen metin GÜNCELLENİR", async () => {
    const onCommitHours = vi.fn();
    const user = userEvent.setup();
    render(<Harness initialHours="9.00" onCommitHours={onCommitHours} />);

    const input = screen.getByLabelText("Ahmet Yılmaz · 3 Ağu saati");
    expect(input).toHaveValue("9");

    await user.click(screen.getByRole("button", { name: "Dışarıdan güncelle (12)" }));
    expect(input).toHaveValue("12");
  });

  it("🔴 dışarıdan güncelleme sonrası Enter, BAYAT eski değeri YAZMAZ", async () => {
    const onCommitHours = vi.fn();
    const user = userEvent.setup();
    render(<Harness initialHours="9.00" onCommitHours={onCommitHours} />);

    await user.click(screen.getByRole("button", { name: "Dışarıdan güncelle (12)" }));

    const input = screen.getByLabelText("Ahmet Yılmaz · 3 Ağu saati");
    await user.click(input);
    await user.keyboard("{Enter}");

    // Değer zaten "12" ile aynı → hiçbir commit çağrılmamalı (özellikle "9" ile DEĞİL).
    expect(onCommitHours).not.toHaveBeenCalledWith("p-1", "2026-08-03", "9");
    expect(onCommitHours).not.toHaveBeenCalled();
  });

  it("dışarıdan güncelleme sonrası kullanıcı yeni bir değer yazıp Enter'a basınca GÜNCEL değer gider", async () => {
    const onCommitHours = vi.fn();
    const user = userEvent.setup();
    render(<Harness initialHours="9.00" onCommitHours={onCommitHours} />);

    await user.click(screen.getByRole("button", { name: "Dışarıdan güncelle (12)" }));

    const input = screen.getByLabelText("Ahmet Yılmaz · 3 Ağu saati");
    await user.clear(input);
    await user.type(input, "15");
    await user.keyboard("{Enter}");

    expect(onCommitHours).toHaveBeenCalledWith("p-1", "2026-08-03", "15");
  });

  it("🔴 triyaj #353 — değer DEĞİŞMEDEN blur olunca commit çağrılmaz (dirtyKeys şişmez)", async () => {
    const onCommitHours = vi.fn();
    const user = userEvent.setup();
    render(<Harness initialHours="9.00" onCommitHours={onCommitHours} />);

    const input = screen.getByLabelText("Ahmet Yılmaz · 3 Ağu saati");
    await user.click(input);
    await user.tab(); // odaktan çık, değer değişmedi

    expect(onCommitHours).not.toHaveBeenCalled();
  });

  it("değer GERÇEKTEN değişince blur commit çağırır", async () => {
    const onCommitHours = vi.fn();
    const user = userEvent.setup();
    render(<Harness initialHours="9.00" onCommitHours={onCommitHours} />);

    const input = screen.getByLabelText("Ahmet Yılmaz · 3 Ağu saati");
    await user.clear(input);
    await user.type(input, "7.5");
    await user.tab();

    expect(onCommitHours).toHaveBeenCalledWith("p-1", "2026-08-03", "7.5");
  });
});
