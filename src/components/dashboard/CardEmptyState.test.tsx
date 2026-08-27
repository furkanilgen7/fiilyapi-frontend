import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CardEmptyState } from "./CardEmptyState";

describe("CardEmptyState", () => {
  it("baslik ve modul metnini basar", () => {
    render(<CardEmptyState title="Henüz hakediş verisi yok" pendingModule="progress_payments" />);
    expect(screen.getByText("Henüz hakediş verisi yok")).toBeInTheDocument();
    expect(screen.getByText("Hakediş verisi bu yüzeye henüz bağlanmadı")).toBeInTheDocument();
  });

  it("bilinmeyen modul anahtarinda genel metin basar", () => {
    render(<CardEmptyState title="Uyarı yok" pendingModule="bilinmeyen" />);
    expect(screen.getByText("İlgili modülle birlikte gelir")).toBeInTheDocument();
  });

  it("fatura modulunu esler", () => {
    render(<CardEmptyState title="Henüz fatura verisi yok" pendingModule="invoicing" />);
    expect(screen.getByText("Fatura verisi bu yüzeye henüz bağlanmadı")).toBeInTheDocument();
  });
});

describe("CardEmptyState · pendingModule verilmediginde", () => {
  it("gerekce paragrafi HIC basilmaz", () => {
    const { container } = render(<CardEmptyState title="Onay bekleyen kayıt yok" />);
    expect(container.querySelector(".dash-empty__hint")).toBeNull();
  });
});

// 🔴 K-ZARF ÜÇÜNCÜ HÂL (kullanıcı kararı 2026-08-27, backend `restricted()`).
// `available:false` + `pending_module:null` = "rolün izni yok". O hâlde
// `pendingModuleLabel(null)` "İlgili modülle birlikte gelir" döndürür ve bu
// cümle YALANDIR — modül vardır, izin yoktur. Ekran sahte gerekçe BASMAZ.
describe("CardEmptyState · ucuncu zarf hali (pendingModule=null)", () => {
  it("izin yok halinde gerekce paragrafi HIC basilmaz", () => {
    const { container } = render(<CardEmptyState title="Uyarı yok" pendingModule={null} />);
    expect(screen.getByText("Uyarı yok")).toBeInTheDocument();
    expect(container.querySelector(".dash-empty__hint")).toBeNull();
    expect(screen.queryByText("İlgili modülle birlikte gelir")).toBeNull();
  });

  // K-IKIZ1 ikizi: aynı bileşen, DOLU anahtarla gerekçeyi basmaya DEVAM eder.
  // (Kusurun "hepsini sustur" diye düzeltilmesi bu ikizle ölür.)
  it("IKIZ · dolu anahtarda gerekce basilmaya DEVAM eder", () => {
    const { container } = render(
      <CardEmptyState title="Uyarı yok" pendingModule="progress_payments" />,
    );
    expect(container.querySelector(".dash-empty__hint")).not.toBeNull();
    expect(screen.getByText("Hakediş verisi bu yüzeye henüz bağlanmadı")).toBeInTheDocument();
  });

  // K-IKIZ1 ikizi: `undefined` (çağıranın bilerek atladığı bayat anahtar) da
  // sessiz kalır — `null` ile aynı sonuç, AYRI gerekçe.
  it("IKIZ · undefined anahtarda da gerekce basilmaz", () => {
    const { container } = render(
      <CardEmptyState title="Uyarı yok" pendingModule={undefined} />,
    );
    expect(container.querySelector(".dash-empty__hint")).toBeNull();
  });
});
