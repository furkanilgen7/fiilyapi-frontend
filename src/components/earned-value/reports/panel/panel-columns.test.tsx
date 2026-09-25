import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PANEL_COLUMNS } from "./panel-columns";
import type { EvPanelRow } from "./panel-tree";

/**
 * S32 KESİNLEŞTİ (CEO, 2026-09-26) — `non_direct` satırı: ad backend'den TEK
 * STRING gelir ("Genel / Dolaylı · bütçe dışı", mockup Panel:542-544
 * birebir) — istemci EKLEME YAPMAZ (çift basardı, ÖNCEKİ tur kusuruydu).
 * Alt etiket (`indirect_item_names`, YOKSA hiç basılmaz). `panel-tree.ts` bu
 * alanı openapi şemasına YEREL genişletme olarak ekler (EV-BORC-9
 * netleşene dek, alan adı `indirect_item_names` KESİNLEŞTİ).
 */
const nameColumn = PANEL_COLUMNS.find((c) => c.key === "name")!;

function node(data: Partial<EvPanelRow>) {
  return { id: "n", data: data as EvPanelRow };
}

describe("PANEL_COLUMNS — name kolonu · non_direct satırı (S32)", () => {
  it("ad backend `name`inden OLDUĞU GİBİ basılır — istemci EK METİN eklemez", () => {
    render(<>{nameColumn.render(node({ scope: "non_direct", name: "Genel / Dolaylı · bütçe dışı" }), 0)}</>);
    expect(screen.getByText("Genel / Dolaylı · bütçe dışı")).toBeInTheDocument();
  });

  it("`indirect_item_names` VARSA alt etiket '·' ile birleşik basılır", () => {
    render(
      <>
        {nameColumn.render(
          node({
            scope: "non_direct",
            name: "Genel / Dolaylı · bütçe dışı",
            indirect_item_names: ["Mobilizasyon", "Şantiye temizliği"],
          }),
          0,
        )}
      </>,
    );
    expect(screen.getByText("Mobilizasyon · Şantiye temizliği")).toBeInTheDocument();
  });

  it("`indirect_item_names` YOKSA alt etiket HİÇ BASILMAZ", () => {
    render(<>{nameColumn.render(node({ scope: "non_direct", name: "Genel / Dolaylı · bütçe dışı" }), 0)}</>);
    expect(screen.queryByText(/Mobilizasyon/)).not.toBeInTheDocument();
  });

  it("`indirect_item_names` BOŞ DİZİYSE alt etiket basılmaz (öğe kutucuğu boş açılmaz)", () => {
    const { container } = render(
      <>
        {nameColumn.render(
          node({ scope: "non_direct", name: "Genel / Dolaylı · bütçe dışı", indirect_item_names: [] }),
          0,
        )}
      </>,
    );
    expect(container.querySelector(".ev-panel-table__unit")).toBeNull();
  });

  it("diğer satır türlerinde (disiplin/iş tipi) davranış DEĞİŞMEDİ — ad OLDUĞU GİBİ basılır", () => {
    render(<>{nameColumn.render(node({ scope: "discipline", name: "Kaba İnşaat", contractor_mix: null, uom: null }), 0)}</>);
    expect(screen.getByText("Kaba İnşaat")).toBeInTheDocument();
  });
});

/**
 * 🔴 LİDER DENETİMİ KUSURU (P4, 2026-09-26) — `non_direct` satırının
 * "Bütçe a-s" hücresi backend'in GERÇEK "0" değerini basıyordu; mockup
 * (Panel:542-544) bu satırda "–" gösterir (bütçe TABANI YOK, K-SIFIR'ın
 * bilinçli İSTİSNASI — bkz. panel-columns.tsx yorumu). Backend değeri
 * DOĞRU (ölçüldü: `report_panel.py`), fikstür/tablo DEĞİL — bu yüzden bu
 * satırda "0" GİZLENİR, diğer satırlarda GERÇEK bütçe HER ZAMAN basılır.
 */
describe("PANEL_COLUMNS — Bütçe a-s kolonu · non_direct 'sıfır bütçe' istisnası (P4)", () => {
  const budgetColumn = PANEL_COLUMNS.find((c) => c.key === "budget")!;

  it("non_direct satırında budget_mhr='0' OLSA BİLE EMPTY_CELL ('—') basılır", () => {
    render(<>{budgetColumn.render(node({ scope: "non_direct", budget_mhr: "0" }), 0)}</>);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("diğer satır türlerinde budget_mhr GERÇEK DEĞERİYLE basılır (K-SIFIR — sıfır maskelenmez)", () => {
    render(<>{budgetColumn.render(node({ scope: "discipline", budget_mhr: "0" }), 0)}</>);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("disiplin satırında GERÇEK bütçe (örn. '27.500') aynen basılır", () => {
    render(<>{budgetColumn.render(node({ scope: "discipline", budget_mhr: "27500" }), 0)}</>);
    expect(screen.getByText("27.500")).toBeInTheDocument();
  });
});

/**
 * 🔴 LİDER DENETİMİ BEKÇİSİ (P5, 2026-09-26) — "Bu hafta PF" hücresi
 * SADECE `pf_week_band` alanına göre boyanır (kendisi HESAPLAMAZ). Fikstür
 * kusuru düzeltildi (`pf_week_band: "high"` → `"green"`, 4 satır) — bu
 * bekçi hücrenin band alanını OLDUĞU GİBİ yansıttığını doğrular.
 */
describe("PANEL_COLUMNS — Bu hafta PF kolonu · band alanı OLDUĞU GİBİ yansır (P5)", () => {
  const pfWeekColumn = PANEL_COLUMNS.find((c) => c.key === "pf_week")!;

  it("band='green' → yüksek değerde (1,21) BİLE .pf-band-cell--green basılır, --high DEĞİL", () => {
    const { container } = render(<>{pfWeekColumn.render(node({ pf_week: "1.212121", pf_week_band: "green" }), 0)}</>);
    expect(container.querySelector(".pf-band-cell--green")).not.toBeNull();
    expect(container.querySelector(".pf-band-cell--high")).toBeNull();
  });

  it("band='high' VERİLİRSE hücre yine de onu basar (kolon KENDİSİ hesaplamaz — alan varsa AYNEN kullanılır)", () => {
    const { container } = render(<>{pfWeekColumn.render(node({ pf_week: "1.06", pf_week_band: "high" }), 0)}</>);
    expect(container.querySelector(".pf-band-cell--high")).not.toBeNull();
  });
});
