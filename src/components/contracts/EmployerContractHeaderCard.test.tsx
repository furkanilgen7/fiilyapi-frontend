import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { EmployerContractHeaderCard } from "./EmployerContractHeaderCard";
import type { EmployerContractDetail } from "@/lib/api/hooks/useContract";

/**
 * F-SZLEKR T1 · E14 başlık kartı — "Bitiş Tarihi" metriğinin TONU.
 *
 * ⚠️ Bu dosya YENİDİR. `EmployerContractDetailView.test.tsx` 841 satırdır ve
 * 800 tavanını ZATEN aşar (devralınan borç); oraya tek satır EKLENMEZ.
 *
 * 🔴 K-IKIZ1 — POZİTİF KONTROL KARŞIT KANIT TAŞIR. Her ton için hem "bu sınıf
 * VAR" hem "öbür iki sınıf YOK" iddiası yazılır. Yalnız yokluk iddiası
 * yazılsaydı YANLIŞ BİR SEÇİCİ de yeşil geçerdi (hiçbir şey bulamayan seçici
 * her zaman "yok" der).
 */

const SUMMARY: EmployerContractDetail["progress_payment_summary"] = {
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

const DETAIL: EmployerContractDetail = {
  project_id: "p-1",
  contract_no: "SZL-2025-001",
  signature_date: "2025-03-15",
  amount: "11200000.00",
  advance_pct: "20.00",
  retainage_pct: "5.00",
  vat_pct: "20.00",
  late_penalty_daily: "15000.00",
  has_price_escalation: true,
  index_type: "tufe",
  status: "active",
  start_date: "2025-04-01",
  end_date: "2026-12-31",
  employer_name: "Güneşkent Gayrimenkul A.Ş.",
  contractor_name: "FİİL Yapı Ltd. Şti.",
  items_total: "12054000.00",
  items_total_diff: "854000.00",
  advance_amount: "2240000.00",
  progress_payment_summary: SUMMARY,
  milestones: null,
  documents: null,
  pending_modules: [],
};

/** Sabit "bugün" — bu dosyada hiçbir iddia gerçek takvime bakmaz. */
const TODAY = new Date(2026, 7, 27); // 2026-08-27

function renderCard(endDate: string | null) {
  render(
    <EmployerContractHeaderCard
      detail={{ ...DETAIL, end_date: endDate }}
      projectName="Kule A"
      today={TODAY}
    />,
  );
  return screen.getByTestId("ecd-metric-end-date");
}

const DANGER = "ecd-metrics__value--danger";
const WARNING = "ecd-metrics__value--warning";

/**
 * 🔴 MUTASYON BEKÇİSİ (ölçüldü: `not.toHaveClass(DANGER/WARNING)` İKİLİSİ
 * YETMEDİ). Nötr dal `tone`u opsiyonel bırakmak yerine `"neutral"`ı olduğu
 * gibi geçirseydi elemana `ecd-metrics__value--neutral` sınıfı basılırdı:
 * iki yokluk iddiası da yeşil geçer, ama stylesheet'te KARŞILIĞI OLMAYAN bir
 * ton adı ekranda yaşamaya devam ederdi (sessiz kusur). Bu yüzden nötr dalda
 * HİÇBİR değiştirici olmadığı doğrudan ölçülür.
 */
function expectNoToneModifier(el: HTMLElement) {
  const modifiers = [...el.classList].filter((c) => c.startsWith("ecd-metrics__value--"));
  expect(modifiers).toEqual([]);
}

describe("EmployerContractHeaderCard · 84 Bitiş Tarihi tonu", () => {
  it("metrik hâlâ 84'ün etiketini ve tarihini basar (ton değişimi içeriği bozmadı)", () => {
    const el = renderCard("2026-12-31");
    expect(screen.getByText("Bitiş Tarihi")).toBeInTheDocument();
    expect(el).toHaveTextContent("31.12.2026");
  });

  it("GEÇMİŞ bitiş KIRMIZI basar — kehribar ya da nötr DEĞİL", () => {
    const el = renderCard("2026-08-26"); // dün
    expect(el).toHaveClass(DANGER); // pozitif
    expect(el).not.toHaveClass(WARNING); // karşıt kanıt
  });

  it("YAKLAŞAN bitiş (30 gün) KEHRİBAR basar — kırmızı DEĞİL", () => {
    const el = renderCard("2026-09-26"); // +30 gün, sınır dâhil
    expect(el).toHaveClass(WARNING); // pozitif
    expect(el).not.toHaveClass(DANGER); // karşıt kanıt
  });

  it("UZAK bitiş NÖTR basar — hiçbir ton sınıfı taşımaz", () => {
    const el = renderCard("2026-12-31"); // +126 gün
    // Karşıt kanıt: seçici GERÇEKTEN bir şey buluyor ve taban sınıfı yerinde.
    expect(el).toHaveClass("ecd-metrics__value");
    expect(el).not.toHaveClass(DANGER);
    expect(el).not.toHaveClass(WARNING);
    expectNoToneModifier(el);
  });

  it("`end_date` yoksa NÖTR + '—' basar (eksik veri uyarı değildir)", () => {
    const el = renderCard(null);
    expect(el).toHaveTextContent("—");
    expect(el).toHaveClass("ecd-metrics__value");
    expect(el).not.toHaveClass(DANGER);
    expect(el).not.toHaveClass(WARNING);
    expectNoToneModifier(el);
  });

  /**
   * 🔴 `today` PROP'U GERÇEKTEN OKUNUYOR MU? Aynı `end_date`, iki ayrı
   * "bugün" ile iki ayrı ton basmalı. Bileşen içinde gizli bir `new Date()`
   * olsaydı (ya da prop yok sayılsaydı) bu düşer.
   */
  it("aynı tarih farklı 'bugün' prop'uyla farklı ton basar", () => {
    const { unmount } = render(
      <EmployerContractHeaderCard
        detail={{ ...DETAIL, end_date: "2026-12-01" }}
        projectName="Kule A"
        today={new Date(2026, 11, 2)} // 02.12.2026 → geçti
      />,
    );
    expect(screen.getByTestId("ecd-metric-end-date")).toHaveClass(DANGER);
    unmount();

    render(
      <EmployerContractHeaderCard
        detail={{ ...DETAIL, end_date: "2026-12-01" }}
        projectName="Kule A"
        today={new Date(2026, 10, 15)} // 15.11.2026 → 16 gün kaldı
      />,
    );
    expect(screen.getByTestId("ecd-metric-end-date")).toHaveClass(WARNING);
  });

  /**
   * Ürün içi tutarsızlığın kapandığının kanıtı: metrik ARTIK koşulsuz kırmızı
   * değildir. Eski hâlde (`tone="danger"` sabiti) bu iddia KIRMIZI olurdu.
   */
  it("metrik ŞERİDİNDE koşulsuz kırmızı YOKTUR — bedel metriği mono kalır", () => {
    renderCard("2026-12-31");
    const strip = screen.getByTestId("ecd-metrics");
    expect(strip.querySelectorAll(`.${DANGER}`)).toHaveLength(0);
    // Karşıt kanıt: seçici çalışıyor — para metriği hâlâ kendi sınıfını taşır.
    expect(strip.querySelectorAll(".ecd-metrics__value--money")).toHaveLength(1);
  });
});
