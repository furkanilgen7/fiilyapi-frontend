// @vitest-environment node
//
// "Bağlı Proje" bilgi kutusundaki proje tipi etiketi (mockup satır 56).
// Mockup `· Taahhüt Projesi` basar; `PROJECT_TABS` sözlüğü ise sekme adları
// için `Taahhüt` taşır. İkisi AYRI bağlamlardır — sekme sözlüğü bozulmadan
// bu bağlama özgü etiket tek kaynaktan verilir.
import { describe, it, expect } from "vitest";

import { PROJECT_TABS } from "@/components/projects/tabs";
import { projectTypeBannerLabel } from "./project-type-label";

describe("projectTypeBannerLabel", () => {
  it("taahhut icin mockup satir 56'daki 'Taahhüt Projesi' dizesini basar", () => {
    expect(projectTypeBannerLabel("taahhut")).toBe("Taahhüt Projesi");
  });

  it("kendi_yatirim icin 'Kendi Yatırım Projesi' basar", () => {
    // "Proje - Kendi Yatırım.dc.html" satır 57: "Kendi Yatırım Projesi:".
    expect(projectTypeBannerLabel("kendi_yatirim")).toBe("Kendi Yatırım Projesi");
  });

  it("kat_karsiligi icin 'Kat Karşılığı Projesi' basar", () => {
    expect(projectTypeBannerLabel("kat_karsiligi")).toBe("Kat Karşılığı Projesi");
  });

  it("bilinmeyen tip ham anahtarla basilir (sessiz bos dize yok)", () => {
    expect(projectTypeBannerLabel("yeni_tip")).toBe("yeni_tip");
  });
});

describe("PROJECT_TABS sekme sözlüğü bozulmadı", () => {
  it("sekme etiketleri hala kisa adlari tasir ('Projesi' eki YOK)", () => {
    // Bu dilimde banner etiketi ayrildi; sekme adlari degismemeli.
    expect(PROJECT_TABS.map((tab) => tab.label)).toEqual([
      "Tümü",
      "Taahhüt",
      "Kendi Yatırım",
      "Kat Karşılığı",
      "Tamamlanan",
    ]);
  });
});
