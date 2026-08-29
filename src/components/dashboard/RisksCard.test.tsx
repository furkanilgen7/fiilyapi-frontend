import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { components } from "@/lib/api/schema";

import { RisksCard, rowKey } from "./RisksCard";

type RiskAlerts = components["schemas"]["RiskAlertsPlaceholder"];

const STOCK: components["schemas"]["RiskAlert"] = {
  severity: "warning",
  title: "Stok kritik seviyede",
  detail: "Bağ Teli 1,5 mm – kalan 109 kg",
  module: "inventory",
};
const PAYMENT: components["schemas"]["RiskAlert"] = {
  severity: "danger",
  title: "Hakediş gecikmiş",
  detail: "Çelik OSB – 14 gün gecikme",
  module: "progress_payments",
};
const GOOD_NEWS: components["schemas"]["RiskAlert"] = {
  severity: "success",
  title: "Hedef aşıldı",
  detail: "Belediye Yol – %3 erken teslim",
  module: "projects",
};

function card(data: Partial<RiskAlerts>) {
  return render(<RisksCard data={{ available: true, ...data }} />);
}

function rowFor(title: string): HTMLElement {
  const el = screen.getByText(title).closest("li");
  if (!el) throw new Error(`satir bulunamadi: ${title}`);
  return el;
}

describe("RisksCard — RISK-1 kirici zarf gecisi", () => {
  // ─── POZİTİF KONTROL ────────────────────────────────────────────────────
  // 🔴 CANLI KUSURUN AYNASI: eski kart nesneyi React cocugu olarak basiyordu
  // ve acilis sayfasinin TAMAMI cokuyordu. Bu iddia once "ekran AYAKTA MI"
  // sorusunu yanitlar; hicbir satir gorunmezse geri kalan her sey anlamsizdir.
  it("POZITIF KONTROL — izinli halde UC satir da GORUNUR (iki metniyle)", () => {
    card({ items: [STOCK, PAYMENT, GOOD_NEWS], sources: [{ module: "inventory", state: "ok" }] });
    expect(screen.getByText("Stok kritik seviyede")).toBeInTheDocument();
    expect(screen.getByText("Bağ Teli 1,5 mm – kalan 109 kg")).toBeInTheDocument();
    expect(screen.getByText("Hakediş gecikmiş")).toBeInTheDocument();
    expect(screen.getByText("Hedef aşıldı")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("UC SIDDETIN UCU DE kendi sinifini alir (mockup renk eslemesi)", () => {
    card({ items: [STOCK, PAYMENT, GOOD_NEWS] });
    expect(rowFor("Stok kritik seviyede").className).toContain("dash-risk--warning");
    expect(rowFor("Hakediş gecikmiş").className).toContain("dash-risk--danger");
    // 🔴 `success` BIR RISK DEGIL, IYI HABERDIR — kirmizi basilmaz.
    expect(rowFor("Hedef aşıldı").className).toContain("dash-risk--success");
    expect(rowFor("Hedef aşıldı").className).not.toContain("dash-risk--danger");
  });

  // ─── LİSTE ANAHTARI ─────────────────────────────────────────────────────
  // 🔴 DÜRÜST SINIR: "React anahtarı DOĞRU KULLANDI mı" DOM'dan GÖZLENEMEZ —
  // dizin anahtarına çevirdiğimizde satır metinleri yine doğru basıldığı için
  // rerender tabanlı bir iddia EŞDEĞER MUTANT üretiyordu (ölçüldü: `key={i}`
  // mutantı sağ kaldı). O iddia silindi; yerine KARARIN KENDİSİ ölçülür:
  // anahtar KONUMDAN değil İÇERİKTEN türer. Satırlar sunucuda şiddete göre
  // sıralanır, yani araya bir `danger` girdiğinde dizin anahtarları kayardı.
  it("anahtar KONUMDAN degil ICERIKTEN turer ve satiri tekillestirir", () => {
    expect(rowKey(STOCK)).toBe("inventory:Stok kritik seviyede");
    expect(rowKey(PAYMENT)).not.toBe(rowKey(STOCK));
    // Ayni baslik FARKLI modulden gelirse yine ayrilir (modul anahtarin parcasi).
    expect(rowKey({ ...STOCK, module: "purchasing" })).not.toBe(rowKey(STOCK));
    // Ayni modulden farkli baslik da ayrilir (baslik anahtarin parcasi).
    expect(rowKey({ ...STOCK, title: "Baska uyari" })).not.toBe(rowKey(STOCK));
  });

  // ─── ASIL İDDİA · TRİ-STATE ─────────────────────────────────────────────
  it("🔴 TUM kaynaklar `restricted` ise kart 'uyari yok' DEMEZ", () => {
    // Ekranin kullaniciya YALAN soylemesi tam olarak budur: yetkisi olmadigi
    // icin bos kalan bir listeyi "sorun yok" diye basmak.
    card({
      available: false,
      items: [],
      sources: [
        { module: "inventory", state: "restricted" },
        { module: "progress_payments", state: "restricted" },
      ],
    });
    expect(screen.getByText("Uyarıları görme yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByText("Uyarı yok")).not.toBeInTheDocument();
  });

  it("kaynaklar `ok` ve liste bos ise OTORITER 'Uyari yok' basilir", () => {
    card({ items: [], sources: [{ module: "inventory", state: "ok" }] });
    expect(screen.getByText("Uyarı yok")).toBeInTheDocument();
    expect(screen.queryByText("Uyarıları görme yetkiniz yok")).not.toBeInTheDocument();
  });

  it("KISMI yetki: satirlar basilir AMA listenin eksik olabilecegi SOYLENIR", () => {
    card({
      items: [PAYMENT],
      sources: [
        { module: "inventory", state: "restricted" },
        { module: "progress_payments", state: "ok" },
      ],
    });
    expect(screen.getByText("Hakediş gecikmiş")).toBeInTheDocument();
    expect(screen.getByText(/liste eksik olabilir/)).toBeInTheDocument();
  });

  it("TUM kaynaklar `ok` iken kismi bant BASILMAZ", () => {
    card({ items: [PAYMENT], sources: [{ module: "progress_payments", state: "ok" }] });
    expect(screen.queryByText(/liste eksik olabilir/)).not.toBeInTheDocument();
  });

  it("`items`/`sources` HIC gelmezse cokmez (semada opsiyoneller)", () => {
    card({});
    expect(screen.getByText("Uyarı yok")).toBeInTheDocument();
  });
});
