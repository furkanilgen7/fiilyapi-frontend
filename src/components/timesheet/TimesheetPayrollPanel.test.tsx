import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { NAV_GROUPS } from "@/components/shell/nav-config";

import {
  canTransfer,
  payrollGateReason,
  PAYROLL_ROUTE,
  TimesheetPayrollPanel,
} from "./TimesheetPayrollPanel";

/**
 * "Haftadan Bordroya Aktarım" (E5 330-359).
 *
 * 🔴 `Bordroya Aktar` kalıcı bir yer tutucu DEĞİL, VERİYE BAĞLI BİR HÂLDİR
 * (E5 356-357): ayın tüm haftaları girilince AÇILIR. Mockup pasif hâli çizer
 * çünkü örneğinde iki hafta eksiktir.
 */

const BASE = {
  normalHours: "171",
  overtimeHours: "27",
  monthTotalHours: "588",
  monthManDays: "65.3",
  monthWeekCount: 5,
  workerCount: 4,
  weeklyNormalHours: "45",
  normalDayHours: "9",
};

describe("canTransfer · aktarım kapısı", () => {
  it("ayın TÜM haftaları girilince AÇILIR", () => {
    expect(canTransfer(5, [])).toBe(true);
  });

  it("tek bir hafta bile eksikse KAPALI", () => {
    expect(canTransfer(5, [31])).toBe(false);
  });

  it("🔴 BOŞ şerit 'hepsi girildi' DEĞİLDİR — bilinmezlik kapıyı AÇMAZ", () => {
    // Şerit okunamadıysa eksik hafta listesi de boştur; bunu "tamam" saymak
    // eksik bir ayı bordroya aktarmaya davet ederdi.
    expect(canTransfer(0, [])).toBe(false);
  });
});

describe("payrollGateReason", () => {
  it("eksik haftaları ADIYLA yazar (E5 357 '30. ve 31. hafta eksik')", () => {
    expect(payrollGateReason(5, [30, 31])).toContain("30. ve 31. hafta");
  });

  it("hazır hâli de SESSİZ kalmaz", () => {
    expect(payrollGateReason(5, [])).toContain("aktarıma hazır");
  });

  it("okunamayan şeridin gerekçesi ayrıdır", () => {
    expect(payrollGateReason(0, [])).toContain("okunamadı");
  });
});

describe("TimesheetPayrollPanel", () => {
  it("eksik hafta varken düğme PASİFTİR ve sebebi ekranda yazar", () => {
    render(<TimesheetPayrollPanel {...BASE} missingWeeks={[30, 31]} />);
    const action = screen.getByText("Bordroya Aktar");
    expect(action).toHaveAttribute("aria-disabled", "true");
    expect(action.tagName).not.toBe("A");
    expect(screen.getByText(/30\. ve 31\. hafta girilmeden/)).toBeInTheDocument();
  });

  it("🔴 tüm haftalar girilince düğme AÇILIR ve ÜRÜNÜN rotasına gider", () => {
    render(<TimesheetPayrollPanel {...BASE} missingWeeks={[]} />);
    const link = screen.getByRole("link", { name: "Bordroya Aktar" });
    // 🔴 Mockup'ın `Bordro Yönetimi.dc.html` dosya adı KOPYALANMAZ: hedef
    // ÜRÜNÜN gerçek rotasıdır. Sabit metin yerine kabuğun TEK KAYNAĞI okunur —
    // uydurma bir rota (ör. "/bordro-yonetimi") burada yakalanır.
    expect(link).toHaveAttribute("href", PAYROLL_ROUTE);
    const navHrefs = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));
    expect(navHrefs).toContain(PAYROLL_ROUTE);
  });

  it("Ay Kümülatif saat + adam/gün BACKEND alanlarından BAĞLANIR (devre dışı değil)", () => {
    render(<TimesheetPayrollPanel {...BASE} missingWeeks={[]} />);
    expect(screen.getByText("588 saat")).toBeInTheDocument();
    expect(screen.getByText("65,3 adam/gün · SGK")).toBeInTheDocument();
    expect(screen.getByText("Ay Kümülatif (5 hafta)")).toBeInTheDocument();
  });

  it("🔴 Haftalık Brüt uçta YOK — SİLİNMEZ, gerekçesiyle devre dışı basılır", () => {
    render(<TimesheetPayrollPanel {...BASE} missingWeeks={[]} />);
    const card = screen.getByText("Haftalık Brüt").closest(".ts-payroll__card") as HTMLElement;
    expect(card.className).toContain("ts-payroll__card--disabled");
    expect(card).toHaveTextContent("brüt ücret hesabı bu uçta yayınlanmıyor");
    // Uydurma bir tutar BASILMAZ.
    expect(card).not.toHaveTextContent("₺");
  });

  it("haftalık normal saat OKUNUR ama YAZILAMAZ (uçta ayar yazma yolu yok)", () => {
    render(<TimesheetPayrollPanel {...BASE} missingWeeks={[]} />);
    const input = screen.getByLabelText("Haftalık normal mesai saati");
    expect(input).toBeDisabled();
    expect(input).toHaveValue("45");
  });
});
