import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressPaymentsListBody } from "./ProgressPaymentsList";
import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";

// Final inceleme #5: `showProjectName` prop'u — `/hakedisler` (proje-genel)
// listede proje adı etiketi GEREKLİ, şantiye "Hakedişler" sekmesinde
// (`SiteProgressPaymentsView`) proje zaten breadcrumb'ta olduğundan
// gürültüdür. İki ekran AYNI bileşeni paylaştığından (T2+T6 ortak gövde)
// tek bir kopyada iki durum da doğrulanır.
const baseItem: ProgressPaymentListItem = {
  id: "22222222-2222-2222-2222-222222222222",
  project_id: "33333333-3333-3333-3333-333333333333",
  project_name: "Güneşkent A-Blok",
  sequence_no: 5,
  period_year: 2026,
  period_month: 5,
  description: "Kat 6–8 döşeme",
  status: "pending_approval",
  gross_total: "2100000.00",
  net_total: "2000000.00",
};

describe("ProgressPaymentsListBody — showProjectName", () => {
  it("varsayılan (verilmezse) proje adı etiketini basar — /hakedisler davranışı", () => {
    render(<ProgressPaymentsListBody isError={false} isLoading={false} data={{ items: [baseItem] }} />);
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
  });

  it("showProjectName=false iken proje adı etiketini BASMAZ — şantiye sekmesi davranışı", () => {
    render(
      <ProgressPaymentsListBody
        isError={false}
        isLoading={false}
        data={{ items: [baseItem] }}
        showProjectName={false}
      />,
    );
    expect(screen.queryByText("Güneşkent A-Blok")).not.toBeInTheDocument();
    // Satırın geri kalanı (başlık, açıklama) hâlâ basılır — yalnız proje
    // etiketi kaldırıldı.
    expect(screen.getByText("#5 — Mayıs 2026")).toBeInTheDocument();
    expect(screen.getByText("Kat 6–8 döşeme")).toBeInTheDocument();
  });

  // Dolu liste hiç boş metin basmaz (kombinasyonlardan biri sızarsa yakalar).
  it("dolu liste hiçbir boş durum metni basmaz", () => {
    render(<ProgressPaymentsListBody isError={false} isLoading={false} data={{ items: [baseItem] }} />);
    expect(screen.queryByText(/Henüz hakediş oluşturulmadı/)).not.toBeInTheDocument();
    expect(screen.queryByText(/hakediş yok/)).not.toBeInTheDocument();
  });
});

// F-SZLEKR T2: KUSUR — "+ Yeni Hakediş ile başlayın" ölü talimattı (üç üretim
// çağıranın ÜÇÜNDE de yanlış). Kök çözüm: ipucu artık `newActionLabel`
// prop'undan üretilir (tek kaynak) veya eylem hiç vaat etmez. `isFiltered`
// (boolean) yerine `emptyScope` (ayrık birlik) — dört-hâl deseni imkânsız.
describe("ProgressPaymentsListBody — emptyScope × newActionLabel", () => {
  it("emptyScope='all' (varsayılan) + newActionLabel dolu → başlık DEĞİŞMEZ, ipucu etikete göre üretilir", () => {
    render(
      <ProgressPaymentsListBody
        isError={false}
        isLoading={false}
        data={{ items: [] }}
        newActionLabel="+ Yeni Hakediş"
      />,
    );
    expect(screen.getByText("Henüz hakediş oluşturulmadı")).toBeInTheDocument();
    expect(screen.getByText("+ Yeni Hakediş ile başlayın")).toBeInTheDocument();
  });

  it("emptyScope='all' + newActionLabel=null (varsayılan) → eylem vaat ETMEYEN dürüst ipucu", () => {
    render(<ProgressPaymentsListBody isError={false} isLoading={false} data={{ items: [] }} />);
    expect(screen.getByText("Henüz hakediş oluşturulmadı")).toBeInTheDocument();
    expect(
      screen.getByText("Hakedişler ekranından oluşturulan kayıtlar burada listelenir"),
    ).toBeInTheDocument();
    // Pozitif kontrol karşıtı (K-IKIZ1): eski ölü talimat hiçbir dalda basılmaz.
    expect(screen.queryByText(/ile başlayın/)).not.toBeInTheDocument();
  });

  it("emptyScope='filtered' → başlık ve ipucu DEĞİŞMEZ (newActionLabel'dan ETKİLENMEZ)", () => {
    render(
      <ProgressPaymentsListBody
        isError={false}
        isLoading={false}
        data={{ items: [] }}
        emptyScope="filtered"
        newActionLabel="+ Yeni Hakediş"
      />,
    );
    expect(screen.getByText("Seçili projede hakediş yok")).toBeInTheDocument();
    expect(
      screen.getByText("Tüm hakedişleri görmek için proje süzgecini Tüm Projeler yapın"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ile başlayın/)).not.toBeInTheDocument();
  });

  it("emptyScope='filtered' + newActionLabel=null → ipucu yine süzgeç metni (etkilenmez)", () => {
    render(
      <ProgressPaymentsListBody isError={false} isLoading={false} data={{ items: [] }} emptyScope="filtered" />,
    );
    expect(
      screen.getByText("Tüm hakedişleri görmek için proje süzgecini Tüm Projeler yapın"),
    ).toBeInTheDocument();
  });

  it("emptyScope='contract' → YENİ başlık, newActionLabel yokken dürüst ipucu", () => {
    render(
      <ProgressPaymentsListBody isError={false} isLoading={false} data={{ items: [] }} emptyScope="contract" />,
    );
    expect(screen.getByText("Bu sözleşmede hakediş yok")).toBeInTheDocument();
    expect(
      screen.getByText("Hakedişler ekranından oluşturulan kayıtlar burada listelenir"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ile başlayın/)).not.toBeInTheDocument();
  });

  it("emptyScope='contract' + newActionLabel dolu → ipucu etikete göre üretilir", () => {
    render(
      <ProgressPaymentsListBody
        isError={false}
        isLoading={false}
        data={{ items: [] }}
        emptyScope="contract"
        newActionLabel="+ Hakediş Oluştur"
      />,
    );
    expect(screen.getByText("Bu sözleşmede hakediş yok")).toBeInTheDocument();
    expect(screen.getByText("+ Hakediş Oluştur ile başlayın")).toBeInTheDocument();
  });
});

// F-SZLEKR T2 — çağıran-düzeyi bekçi: düğme etiketi ile ipucu etiketinin AYNI
// sabitten geldiğini kanıtlar. `canWrite=false` iken eylem metni hiç basılmaz.
describe("ProgressPaymentsListBody — newActionLabel kapı davranışı", () => {
  it("newActionLabel=null iken (canWrite=false eşleniği) hiçbir eylem metni basılmaz", () => {
    render(
      <ProgressPaymentsListBody
        isError={false}
        isLoading={false}
        data={{ items: [] }}
        newActionLabel={null}
      />,
    );
    expect(screen.queryByText(/ile başlayın/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Hakedişler ekranından oluşturulan kayıtlar burada listelenir"),
    ).toBeInTheDocument();
  });
});
