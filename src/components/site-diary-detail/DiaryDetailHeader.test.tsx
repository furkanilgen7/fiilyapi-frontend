import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { SiteDiaryEntryDetail, SiteDiaryLineRead } from "@/lib/api/hooks/useSiteDiary";

import { DiaryDetailHeader, type DiaryDetailHeaderProps } from "./DiaryDetailHeader";

// DET-1.2 · başlık kartı (mockup D:54-96 + İ:112 + HÖ:89-93 uyarlaması) — sunum.

const CURRENT = { id: "sec-k610", name: "Kat 6–10 Kaba İnşaat" };
const K15 = { id: "sec-k15", name: "Kat 1–5 İnce İşler" };

function line(id: string, section: { id: string; name: string }): SiteDiaryLineRead {
  return {
    id,
    boq_item_id: `bi-${id}`,
    code: "03.001",
    description: "C25/30 Beton",
    unit: "m³",
    unit_price: "1520.00",
    quantity: "12.000",
    cumulative_quantity: "120.000",
    line_amount: "18240.00",
    section_id: section.id,
    section_name: section.name,
  } satisfies SiteDiaryLineRead;
}

function entry(overrides: Partial<SiteDiaryEntryDetail> = {}): SiteDiaryEntryDetail {
  return {
    id: "e-24",
    site_id: "s-1",
    project_id: "p-1",
    entry_date: "2026-09-24",
    status: "submitted",
    weather: "sunny",
    work_done: "6. kat döşeme betonu döküldü.",
    chief_note: null,
    safety_meeting_held: true,
    ppe_checked: true,
    has_incident: false,
    incident_note: null,
    section_id: CURRENT.id,
    section_name: CURRENT.name,
    site_name: "A-Blok Şantiyesi",
    project_name: "Güneşkent Konut",
    created_by: "u-hasan",
    created_at: "2026-09-24T05:12:00Z",
    updated_at: "2026-09-24T15:40:00Z",
    created_by_name: "Hasan Kaya",
    submitted_at: "2026-09-24T15:40:00Z",
    submitted_by: "u-sercan",
    submitted_by_name: "Sercan Öztürk",
    locked: false,
    lock_report_date: null,
    prev_id: "e-23",
    prev_entry_date: "2026-09-23",
    next_id: "e-25",
    next_entry_date: "2026-09-25",
    lines: [],
    worker_counts: [],
    lines_total: "0.00",
    worker_total: 0,
    ...overrides,
  } satisfies SiteDiaryEntryDetail;
}

function renderHeader(props: Partial<DiaryDetailHeaderProps> = {}) {
  return render(
    <DiaryDetailHeader
      entry={entry()}
      currentSection={CURRENT}
      entryHref={(id) => `/detay/${id}`}
      openHref={undefined}
      {...props}
    />,
  );
}

describe("DiaryDetailHeader — meta ve yazar satırı", () => {
  it("meta satırı: bölüm · şantiye · proje (D:62 uyarlaması)", () => {
    renderHeader();

    expect(screen.getByTestId("diary-detail-meta")).toHaveTextContent(
      "Kat 6–10 Kaba İnşaat · A-Blok Şantiyesi · Güneşkent Konut",
    );
  });

  it("Oluşturan / Gönderen satırı saatleriyle basılır (İ:112 uyarlaması)", () => {
    renderHeader();

    expect(screen.getByTestId("diary-detail-author")).toHaveTextContent(
      "Oluşturan: Hasan Kaya · 24.09 08:12 · Gönderen: Sercan Öztürk · 24.09 18:40",
    );
  });

  it("taslakta 'Henüz gönderilmedi' basılır, Gönderen basılmaz (hâl b)", () => {
    renderHeader({
      entry: entry({ status: "draft", submitted_at: null, submitted_by: null, submitted_by_name: null, created_at: "2026-09-25T05:05:00Z" }),
    });

    const author = screen.getByTestId("diary-detail-author");
    expect(author).toHaveTextContent("Oluşturan: Hasan Kaya · 25.09 08:05 · Henüz gönderilmedi");
    expect(author).not.toHaveTextContent("Gönderen");
  });
});

describe("DiaryDetailHeader — Kural A 'Satırla bağlı' (hâl liste-b)", () => {
  it("başlık bölümü başkaysa hap + 'Başlık bölümü: … · bu bölüme (…) N miktar satırı'", () => {
    renderHeader({
      entry: entry({
        section_id: "sec-k15",
        section_name: "Kat 1–5 İnce İşler",
        lines: [line("a", CURRENT), line("b", CURRENT), line("c", K15)],
      }),
    });

    expect(screen.getByText("Satırla bağlı")).toHaveClass("diary-detail__pill--neutral");
    expect(screen.getByTestId("diary-detail-meta")).toHaveTextContent(
      "Başlık bölümü: Kat 1–5 İnce İşler · bu bölüme (Kat 6–10 Kaba İnşaat) 2 miktar satırı · A-Blok Şantiyesi · Güneşkent Konut",
    );
  });

  it("başlığı BU bölüm olan günde 'Satırla bağlı' hapı YOK", () => {
    renderHeader();

    expect(screen.queryByText("Satırla bağlı")).not.toBeInTheDocument();
  });
});

describe("DiaryDetailHeader — kilit (S9: herkese)", () => {
  it("kilitli günde hap + bant basılır (İ:145 · İ:144-148)", () => {
    renderHeader({ entry: entry({ locked: true, lock_report_date: "2026-09-25" }) });

    expect(screen.getByText("Kilitli · 25.09.2026 raporu")).toHaveClass("diary-detail__pill--lock");
    expect(screen.getByTestId("diary-detail-lock-band")).toHaveTextContent(
      "Bu gün 25.09.2026 raporuyla kilitlendi. Kayıt değiştirilemez.",
    );
  });

  it("kilitsiz günde hap da bant da YOK", () => {
    renderHeader();

    expect(screen.queryByText(/Kilitli/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("diary-detail-lock-band")).not.toBeInTheDocument();
  });
});

describe("DiaryDetailHeader — günler arası gezinme (HÖ:89-93 uyarlaması)", () => {
  it("önceki/sonraki kayda bölüm bağlamındaki kimlikle bağlanır, etiket kısa tarih", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: "Günler arası gezinme" });

    expect(within(nav).getByRole("link", { name: "Önceki kayıt: 23.09.2026" })).toHaveAttribute(
      "href",
      "/detay/e-23",
    );
    expect(within(nav).getByRole("link", { name: "Sonraki kayıt: 25.09.2026" })).toHaveAttribute(
      "href",
      "/detay/e-25",
    );
    expect(nav).toHaveTextContent("23.09");
    expect(nav).toHaveTextContent("24.09");
    expect(nav).toHaveTextContent("25.09");
  });

  it("uçlarda bağlantı YOK — pasif sözcük + açıklama (hâl j)", () => {
    renderHeader({ entry: entry({ next_id: null, next_entry_date: null, prev_id: null, prev_entry_date: null }) });
    const nav = screen.getByRole("navigation", { name: "Günler arası gezinme" });

    expect(within(nav).queryByRole("link")).not.toBeInTheDocument();
    expect(within(nav).getByText("Sonraki").closest("[aria-disabled]")).toHaveAttribute(
      "title",
      "Bu bölümde daha yeni kayıt yok",
    );
    expect(within(nav).getByText("Önceki").closest("[aria-disabled]")).toHaveAttribute(
      "title",
      "Bu bölümde daha eski kayıt yok",
    );
  });
});

describe("DiaryDetailHeader — 'Günlük kayıtta aç'", () => {
  it("hedef verilirse bağlantı basılır", () => {
    renderHeader({ openHref: "/gunluk" });

    expect(screen.getByRole("link", { name: "Günlük kayıtta aç" })).toHaveAttribute("href", "/gunluk");
  });

  it("hedef verilmezse (yazamayan / kilitli gün) basılmaz", () => {
    renderHeader({ openHref: undefined });

    expect(screen.queryByRole("link", { name: "Günlük kayıtta aç" })).not.toBeInTheDocument();
  });
});
