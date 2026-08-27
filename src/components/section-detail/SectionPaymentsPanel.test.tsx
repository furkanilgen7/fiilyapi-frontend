import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { buildListTruncation } from "@/lib/list-truncation";

import { SectionPaymentsPanel } from "./SectionPaymentsPanel";

// F-BLMSEK T2 · Bölüm Detay › "Hakediş" sekmesinin GÖVDESİ.

const PROJECT_ID = "p-1";
const SITE_ID = "s-1";
const SECTION_ID = "sec-1";
const OTHER_SECTION_ID = "sec-2";
const SECTION_NAME = "Kat 6–10 Kaba İnşaat";
const PAYMENTS_HREF = `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/hakedisler`;

function payment(overrides: Partial<SiteSubcontractorPaymentItem> = {}): SiteSubcontractorPaymentItem {
  return {
    id: "pp-1",
    contractId: "c-1",
    subcontractorName: "Akın İnşaat",
    sequenceNo: 3,
    periodYear: 2026,
    periodMonth: 7,
    workCategory: "Betonarme İşleri",
    sectionId: SECTION_ID,
    grossTotal: "182400.00",
    netTotal: "160000.00",
    status: "approved",
    isRevisionRequired: false,
    ...overrides,
  } as SiteSubcontractorPaymentItem;
}

function renderPanel(props: Partial<React.ComponentProps<typeof SectionPaymentsPanel>> = {}) {
  return render(
    <SectionPaymentsPanel
      sectionId={SECTION_ID}
      sectionName={SECTION_NAME}
      items={[]}
      isLoading={false}
      isError={false}
      isPartial={false}
      truncation={buildListTruncation(0, 0)}
      paymentsHref={PAYMENTS_HREF}
      {...props}
    />,
  );
}

describe("SectionPaymentsPanel — kapsam iddiası", () => {
  // 🔴 2c: bu sekme "bölümün hakedişleri" gibi GÖRÜNÜR ama yalnız TAŞERON
  // hakedişlerini basar. İşveren hakedişinin bölüm alanı YOKTUR (ölçüldü:
  // `progress_payments/` altında `section_id` sıfır isabet). Kullanıcı bunu
  // GÖRÜNÜR bir satırdan öğrenir — `title=`/`sr-only` değil.
  it("kapsam satırı BOŞ listede basılır", () => {
    renderPanel({ items: [] });

    expect(screen.getByTestId("section-payments-scope")).toHaveTextContent(
      /Yalnız taşeron hakedişleri listelenir/,
    );
  });

  it("kapsam satırı DOLU listede de basılır (yalnız boş dala kaçmaz)", () => {
    renderPanel({ items: [payment()] });

    expect(screen.getByTestId("section-payments-scope")).toHaveTextContent(
      /Yalnız taşeron hakedişleri listelenir/,
    );
  });

  it("kapsam satırı gerekçeyi `pending-modules` anahtarından ALIR (kopya cümle yazılmaz)", () => {
    renderPanel({ items: [payment()] });

    expect(screen.getByTestId("section-payments-scope")).toHaveTextContent(
      "İşveren hakedişi bölüme kırılmıyor (hakediş kaydı bölüm alanı taşımıyor)",
    );
  });
});

describe("SectionPaymentsPanel — süzgeç ve dışarıda kalanlar", () => {
  it("🔴 K-IKIZ1 · BU bölümün ve `null` bölümün satırı BASILIR, BAŞKA bölümünki BASILMAZ", () => {
    renderPanel({
      items: [
        payment({ id: "hedef", subcontractorName: "Hedef Taşeron", sequenceNo: 1 }),
        payment({
          id: "baska",
          subcontractorName: "Başka Taşeron",
          sequenceNo: 2,
          sectionId: OTHER_SECTION_ID,
        }),
        payment({ id: "tumu", subcontractorName: "Genel Taşeron", sequenceNo: 3, sectionId: null }),
      ],
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("Hedef Taşeron #1")).toBeInTheDocument();
    expect(screen.getByText("Genel Taşeron #3")).toBeInTheDocument();
    expect(screen.queryByText("Başka Taşeron #2")).not.toBeInTheDocument();
  });

  it("BU bölümün satırı bölüm ADINI basar — pending '—' DEĞİL (ekran adı zaten biliyor)", () => {
    renderPanel({ items: [payment({ id: "hedef" })] });

    const row = screen.getAllByRole("listitem")[0];
    expect(row).toHaveTextContent(SECTION_NAME);
    expect(
      within(row).queryByText("Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)"),
    ).not.toBeInTheDocument();
  });

  it("`null` bölümün satırı 'Tüm Bölümler' basar (bölüm adı ile EZİLMEZ)", () => {
    renderPanel({ items: [payment({ id: "tumu", sectionId: null })] });

    const row = screen.getAllByRole("listitem")[0];
    expect(row).toHaveTextContent("Tüm Bölümler");
    expect(row).not.toHaveTextContent(SECTION_NAME);
  });

  it("dışarıda bırakılan satırların SAYISI ve NEREDE görüleceği GÖRÜNÜR basılır", () => {
    renderPanel({
      items: [
        payment({ id: "hedef" }),
        payment({ id: "baska", sectionId: OTHER_SECTION_ID }),
        payment({ id: "baska-2", sectionId: "sec-3" }),
      ],
    });

    const note = screen.getByTestId("section-payments-note");
    expect(note).toHaveTextContent("başka bölüme atanmış 2 hakediş bu listede yok");
    expect(within(note).getByRole("link")).toHaveAttribute("href", PAYMENTS_HREF);
  });

  it("dışarıda kalan YOKSA not BASILMAZ", () => {
    renderPanel({ items: [payment()] });

    expect(screen.queryByTestId("section-payments-note")).not.toBeInTheDocument();
  });
});

describe("SectionPaymentsPanel — boş / yükleme / hata dalları", () => {
  // 🔴 F-BLMPUAN dersi: boş durumun dürüstlüğü kartın KENDİ KAPSAMINI
  // adlandırmasında yaşar. Bölüm adı düşerse kullanıcı "hangi bölümde yok?"
  // sorusunun cevabını kaybeder.
  it("BOŞ listede bile panel kendi KAPSAMINI adlandırır (bölüm adı basılır)", () => {
    renderPanel({ items: [] });

    expect(screen.getByTestId("section-payments")).toHaveTextContent(SECTION_NAME);
  });

  it("boş durum 'veri yok' der — 'bölüme kırılmıyor' DEMEZ", () => {
    renderPanel({ items: [] });

    const empty = screen.getByTestId("section-payments-empty");
    expect(empty).toHaveTextContent("Bu bölümde taşeron hakedişi yok");
    // 🔴 "Veri YOK" ≠ "modül bu bölüme KIRILMIYOR": bağ AÇIK (`section_id`
    // taşeron liste şemasında VAR), eksik olan KAYITTIR. Kapsam satırı
    // "kırılmıyor" der ama o İŞVEREN hakedişi hakkındadır — boş durum DEMEZ.
    expect(empty).not.toHaveTextContent(/kırılmıyor/);
    expect(empty).toHaveTextContent(/bulunmuyor/);
  });

  it("BAŞKA bölümün satırları varken bile boş durum basılır — ama not sessiz kalmaz", () => {
    renderPanel({ items: [payment({ id: "baska", sectionId: OTHER_SECTION_ID })] });

    expect(screen.getByTestId("section-payments-empty")).toBeInTheDocument();
    expect(screen.getByTestId("section-payments-note")).toHaveTextContent(
      "başka bölüme atanmış 1 hakediş bu listede yok",
    );
  });

  it("yüklenirken BOŞ LİSTE basılmaz — 'bu bölümde hakediş yok' YALANI söylenmez", () => {
    renderPanel({ isLoading: true, items: [] });

    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByTestId("section-payments-empty")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("hata dalında liste DEĞİL hata basılır", () => {
    renderPanel({ isError: true, items: [payment()] });

    expect(screen.getByText("Taşeron hakedişleri yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByTestId("section-payments-empty")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("SectionPaymentsPanel — kırpılma dürüstlüğü (2d)", () => {
  // 🔴 İSTEMCİ süzgeci KIRPILMIŞ listeye uygulanırsa bu bölümün hakedişleri
  // tamamen tavanın DIŞINDA kalmış olabilir — panel yine de kendinden emin
  // "Bu bölümde taşeron hakedişi yok" basardı. Bant o güveni kırar.
  it("kırpılmışsa GÖRÜNÜR bant basılır", () => {
    renderPanel({ isPartial: true, truncation: buildListTruncation(200, 431), items: [payment()] });

    expect(screen.getByTestId("section-payments-band")).toHaveTextContent(
      "İlk 200 kayıt gösteriliyor (toplam 431) — liste eksik.",
    );
  });

  it("kırpılmışsa BOŞ durumda da bant basılır (yokluk iddiası GÜVENİLMEZ)", () => {
    renderPanel({ isPartial: true, truncation: buildListTruncation(200, 431), items: [] });

    expect(screen.getByTestId("section-payments-band")).toBeInTheDocument();
    expect(screen.getByTestId("section-payments-empty")).toBeInTheDocument();
  });

  it("kırpılmamışsa bant BASILMAZ", () => {
    renderPanel({ items: [payment()] });

    expect(screen.queryByTestId("section-payments-band")).not.toBeInTheDocument();
  });
});
