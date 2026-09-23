import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// KAYIT 359 · repo kuralı: ham `<button` yasak, `ui/` Button primitive'i
// kullanılır. Ölçüldü: bu dört dosyada dört ham `<button` kullanımı vardı.
// Statik bekçi — geri dönüşü commit anında yakalar (davranış testleri
// `<button>` ile `Button` DOM çıktısını ayırt edemez, ikisi de role=button
// üretir).

const FILES = [
  "TimesheetWeekTable.tsx",
  "TimesheetCellPopover.tsx",
  "TimesheetMonthWeeks.tsx",
];

describe("KAYIT 359 — timesheet dosyalarında ham <button yok", () => {
  it.each(FILES)("%s ham <button kullanmaz", (file) => {
    const source = readFileSync(join(__dirname, file), "utf8");
    expect(source).not.toMatch(/<button\b/);
  });
});
