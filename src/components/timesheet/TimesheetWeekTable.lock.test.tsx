import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TimesheetDayLock } from "./timesheet-lock";
import { TimesheetWeekTable } from "./TimesheetWeekTable";
import type {
  TimesheetWeekDayColumn,
  TimesheetWeekViewRow,
} from "./week-derive";

/**
 * PLN-F2.4 · Haftalık ızgarada KİLİTLİ GÜN — mockup
 * `Şantiye - Puantaj (Kilitli Gün).dc.html` M1 (kolon) + M3 (salt okunur popover).
 * Kadraj: 2026-W39 = Pzt 21 – Paz 27 Eylül; Pzt–Per kilitli.
 */
const DATES = [
  "2026-09-21",
  "2026-09-22",
  "2026-09-23",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
];
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const DAYS: TimesheetWeekDayColumn[] = DATES.map((workDate, index) => ({
  workDate,
  weekday: WEEKDAYS[index] ?? "",
  dayMonth: `${21 + index} Eyl`,
  isSaturday: index === 5,
  isSunday: index === 6,
  totalHours: "9",
  workedDayCount: 1,
  leaveCount: 0,
  temporaryDutyCount: 0,
}));

const ROW: TimesheetWeekViewRow = {
  personnelId: "p-1",
  fullName: "Mehmet Yılmaz",
  trade: "Kalıpçı Usta",
  source: "company",
  subcontractorName: null,
  cells: {
    "2026-09-21": { hours: "9.00", code: null, sectionId: null },
    "2026-09-22": { hours: "11.00", code: null, sectionId: null },
    "2026-09-23": { hours: null, code: "leave", sectionId: null },
    "2026-09-25": { hours: "9.00", code: null, sectionId: null },
    "2026-09-26": { hours: "4.00", code: null, sectionId: null },
  },
  totalHours: "33",
  normalHours: "31",
  overtimeHours: "2",
  isStale: false,
};

const PARTIAL: TimesheetDayLock[] = DATES.slice(0, 4).map((day) => ({
  day,
  reportDate: null,
}));
const FULL: TimesheetDayLock[] = DATES.map((day) => ({
  day,
  reportDate: null,
}));
const DIARY_HREF = "/projeler/p-1/santiyeler/s-1/gunluk-kayit";

function renderTable(dayLocks: readonly TimesheetDayLock[], canWrite = true) {
  return render(
    <TimesheetWeekTable
      days={DAYS}
      rows={[ROW]}
      normalDayHours="9"
      totalHours="33"
      normalHours="31"
      overtimeHours="2"
      isStale={false}
      canWrite={canWrite}
      dirtyKeys={new Set()}
      onCommitHours={vi.fn()}
      onCommitCode={vi.fn()}
      dayLocks={dayLocks}
      diaryHref={DIARY_HREF}
    />,
  );
}

function dayHead(weekday: string): HTMLElement {
  const head = screen
    .getAllByRole("columnheader")
    // "Per" ile "Personel" karışmasın: gün adı kendi hücresinden okunur.
    .find(
      (cell) =>
        cell.querySelector(".ts-week-table__weekday")?.textContent === weekday,
    );
  if (!head) throw new Error(`başlık yok: ${weekday}`);
  return head;
}

describe("TimesheetWeekTable · M1 kilitli kolon", () => {
  it("🔴 kilitli günde <input> BASILMAZ; salt okunur kutu basılır, kilitsiz günde input kalır", () => {
    renderTable(PARTIAL);
    expect(screen.queryByLabelText("Mehmet Yılmaz · 21 Eyl saati")).toBeNull();
    expect(screen.queryByLabelText("Mehmet Yılmaz · 22 Eyl saati")).toBeNull();
    const locked = screen.getByRole("button", {
      name: "Mehmet Yılmaz · 21 Eyl puantajı (kilitli)",
    });
    expect(locked.querySelector("input")).toBeNull();
    expect(within(locked).getByText("9")).toHaveClass("ts-lk");
    // Kilitsiz Cuma düzenlenebilir kalır.
    expect(
      screen.getByLabelText("Mehmet Yılmaz · 25 Eyl saati"),
    ).toBeInTheDocument();
  });

  it("P3 — FM ipucu kilitli hücrede KORUNUR; boş kilitli gün '—'", () => {
    renderTable(PARTIAL);
    const fm = screen.getByRole("button", {
      name: "Mehmet Yılmaz · 22 Eyl puantajı (kilitli)",
    });
    expect(within(fm).getByText("11")).toHaveClass("ts-lk", "ts-lk--overtime");
    const empty = screen.getByRole("button", {
      name: "Mehmet Yılmaz · 24 Eyl puantajı (kilitli)",
    });
    expect(within(empty).getByText("—")).toHaveClass("ts-lk", "ts-lk--empty");
  });

  it("kodlu kilitli gün rozetini korur, kod seçme yüzeyi açılmaz", () => {
    renderTable(PARTIAL);
    const leave = screen.getByRole("button", {
      name: "Mehmet Yılmaz · 23 Eyl puantajı (kilitli)",
    });
    expect(within(leave).getByText("İzin")).toHaveClass(
      "ts-tag",
      "ts-tag--leave",
    );
    expect(
      screen.queryByRole("button", {
        name: "Mehmet Yılmaz · 23 Eyl puantaj kodu",
      }),
    ).toBeNull();
  });

  it("başlık kilit tonunu ve kilit başlığını taşır; kilit sınırı SON kilitli kolondadır", () => {
    renderTable(PARTIAL);
    const monday = dayHead("Pzt");
    expect(monday).toHaveClass("ts-week-table__day-head--locked");
    expect(monday).toHaveAttribute("title", "Kilitli · rapor onayı");
    expect(monday.querySelector("svg")).not.toBeNull();
    expect(monday).not.toHaveClass("ts-week-table__lock-edge");
    expect(dayHead("Per")).toHaveClass("ts-week-table__lock-edge");
    expect(dayHead("Cum")).not.toHaveClass("ts-week-table__day-head--locked");
  });

  it("tamamen kilitli haftada hafta sonu tonu kilit tonuna bırakılır, sınır çizilmez", () => {
    renderTable(FULL);
    const saturday = dayHead("Cmt");
    expect(saturday).toHaveClass("ts-week-table__day-head--locked");
    expect(saturday).not.toHaveClass("ts-week-table__day-head--saturday");
    expect(dayHead("Paz")).not.toHaveClass("ts-week-table__lock-edge");
    const cell = screen
      .getByRole("button", {
        name: "Mehmet Yılmaz · 26 Eyl puantajı (kilitli)",
      })
      .closest("td");
    expect(cell).toHaveClass("ts-week-table__cell--locked");
    expect(cell).not.toHaveClass("ts-week-table__cell--saturday");
  });

  it("ayak (Günlük Toplam) kilitli kolonda salt okunur tondadır; toplam kolonları etkilenmez", () => {
    renderTable(PARTIAL);
    const footCells = screen
      .getByText("Günlük Toplam")
      .closest("tr")
      ?.querySelectorAll("td");
    expect(footCells?.[0]).toHaveClass("ts-week-table__foot-cell--locked");
    expect(footCells?.[3]).toHaveClass("ts-week-table__lock-edge");
    expect(footCells?.[4]).not.toHaveClass("ts-week-table__foot-cell--locked");
    expect(footCells?.[7]).not.toHaveClass("ts-week-table__foot-cell--locked");
  });

  it("kilit yoksa ızgara eskisi gibidir (kilit sınıfı ve kilit düğmesi yok)", () => {
    renderTable([]);
    expect(screen.queryByRole("button", { name: /kilitli/ })).toBeNull();
    expect(
      document.querySelector(".ts-week-table__day-head--locked"),
    ).toBeNull();
    expect(
      screen.getByLabelText("Mehmet Yılmaz · 21 Eyl saati"),
    ).toBeInTheDocument();
  });
});

describe("TimesheetWeekTable · M3 salt okunur popover (§3.14 P1)", () => {
  async function openLocked(name: string) {
    await userEvent.click(screen.getByRole("button", { name }));
    return screen.getByRole("dialog", {
      name: "Mehmet Yılmaz · 22 Eyl — kilitli puantaj hücresi",
    });
  }

  it("değer + kod + kilit notu + 'Günlük kaydına git'; kod rozetleri ve 'Saate dön' YOK", async () => {
    renderTable(PARTIAL);
    const dialog = await openLocked(
      "Mehmet Yılmaz · 22 Eyl puantajı (kilitli)",
    );
    expect(
      within(dialog).getByText("Mehmet Yılmaz · Sal 22 Eyl"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Saat").nextElementSibling,
    ).toHaveTextContent("11");
    expect(
      within(dialog).getByText("Kod").nextElementSibling,
    ).toHaveTextContent("—");
    expect(
      within(dialog).getByText("Bu gün kilitli · rapor onayı"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /Günlük kaydına git/ }),
    ).toHaveAttribute("href", DIARY_HREF);
    expect(within(dialog).queryByRole("button", { name: "İzin" })).toBeNull();
    expect(within(dialog).queryByText("Saate dön")).toBeNull();
  });

  it("× ve Escape kapatır", async () => {
    renderTable(PARTIAL);
    let dialog = await openLocked("Mehmet Yılmaz · 22 Eyl puantajı (kilitli)");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Kapat" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    dialog = await openLocked("Mehmet Yılmaz · 22 Eyl puantajı (kilitli)");
    expect(dialog).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("yazma yetkisi olmayan da kilidin nedenini okuyabilir (salt okunur yüzey)", async () => {
    renderTable(PARTIAL, false);
    const dialog = await openLocked(
      "Mehmet Yılmaz · 22 Eyl puantajı (kilitli)",
    );
    expect(
      within(dialog).getByText("Bu gün kilitli · rapor onayı"),
    ).toBeInTheDocument();
  });
});
