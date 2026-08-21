import { describe, expect, it } from "vitest";

import { SALES_LIST_HREF } from "@/components/unit-shell/routes";
import type { LandShareCountBalance } from "@/lib/api/hooks/useLandShare";

import {
  ALLOCATION_CANCEL_HREF,
  ALLOCATION_CONTRACTOR_LABEL,
  ALLOCATION_FORM_TITLE,
  ALLOCATION_LANDOWNER_LABEL,
  ALLOCATION_MAX_ITEMS,
  ALLOCATION_NO_CHANGES_MESSAGE,
  ALLOCATION_PDF_LABEL,
  ALLOCATION_PDF_PENDING_REASON,
  ALLOCATION_UNASSIGNED_LABEL,
  ALLOCATION_UNCOMPUTABLE,
  allocationActualRatioLabel,
  allocationContractRequirementLabel,
  allocationExpectedNote,
  allocationPageLabel,
  allocationSelectedBadge,
  allocationUnassignedNote,
  autoDistributeLabel,
  shareholderOptionLabel,
} from "./constants";

describe("PG etiketleri", () => {
  it("başlık ve satır içi atama düğmeleri mockup'tan BİREBİRDİR", () => {
    expect(ALLOCATION_FORM_TITLE).toBe("Kat Karşılığı Paylaşım Girişi"); // PG 53
    expect(ALLOCATION_CONTRACTOR_LABEL).toBe("Biz"); // PG 140
    expect(ALLOCATION_LANDOWNER_LABEL).toBe("Arsa"); // PG 141
    expect(ALLOCATION_UNASSIGNED_LABEL).toBe("Atanmadı"); // PG 144
  });

  it("İptal hedefi kabuk canonudur — PG'nin işaret ettiği rota henüz YOK", () => {
    expect(ALLOCATION_CANCEL_HREF).toBe(SALES_LIST_HREF);
  });
});

describe("🔴 PG 101 'Otomatik Dağıt (%55/%45)' — oran ÖRNEK VERİDİR", () => {
  it("etiket sözleşme oranından TÜRETİLİR, mockup'tan kopyalanmaz", () => {
    expect(autoDistributeLabel("55.00", "45.00")).toBe("Otomatik Dağıt (%55/%45)");
  });

  it("başka bir sözleşme başka bir etiket üretir", () => {
    expect(autoDistributeLabel("60.00", "40.00")).toBe("Otomatik Dağıt (%60/%40)");
  });

  it("ondalıklı oran ondalığını KORUR", () => {
    expect(autoDistributeLabel("57.50", "42.50")).toBe("Otomatik Dağıt (%57,5/%42,5)");
  });
});

describe("🔴 PG 270-272 'Paylaşım tutanağı PDF' — sunucuda karşılığı YOK", () => {
  it("kutucuk SİLİNMEZ: etiket + GÖRÜNÜR gerekçe taşır", () => {
    expect(ALLOCATION_PDF_LABEL).toContain("PDF");
    expect(ALLOCATION_PDF_PENDING_REASON.trim()).not.toBe("");
    expect(ALLOCATION_PDF_PENDING_REASON.length).toBeGreaterThan(20);
  });
});

describe("Sunucu sınırları ve hesaplanamaz hâl", () => {
  it("tek istekte en fazla 500 satır (`_MAX_ALLOCATION_ITEMS`)", () => {
    expect(ALLOCATION_MAX_ITEMS).toBe(500);
  });

  it("'hesaplanamaz' SIFIR DEĞİLDİR — ayrı bir metinle basılır", () => {
    expect(ALLOCATION_UNCOMPUTABLE).toBe("—");
    expect(ALLOCATION_UNCOMPUTABLE).not.toBe("0");
  });

  it("değişiklik yokken kaydın engellendiği SÖYLENİR (uç min_length=1 ister)", () => {
    expect(ALLOCATION_NO_CHANGES_MESSAGE.trim()).not.toBe("");
  });
});

describe("T2c — ekran katmanının TÜREV etiketleri", () => {
  const balance: LandShareCountBalance = {
    total_unit_count: 42,
    our_expected_count: 23,
    owner_expected_count: 19,
    our_assigned_count: 20,
    owner_assigned_count: 16,
    unassigned_count: 6,
    our_missing_count: 3,
    owner_missing_count: 3,
  };

  it("PG 71 beklenen adet notu SUNUCU sayılarından kurulur", () => {
    // 42 × %55 = 23,1 → istemcide yuvarlansaydı 23+20=43 çıkabilirdi; sayılar
    // sunucunun TEK yuvarlamasından gelir ve toplamları daima 42'dir.
    expect(allocationExpectedNote(balance)).toBe("42 ünite → Biz 23 · Arsa Sahibi 19");
  });

  it("PG 80 notu İŞARETLİ sayıyı okur — artı EKSİK, eksi FAZLA demektir", () => {
    expect(allocationUnassignedNote(balance)).toBe(
      "6 ünite henüz atanmadı — 3 bize kalmalı, 3 arsa sahibine kalmalı",
    );
    expect(
      allocationUnassignedNote({ ...balance, our_missing_count: -2 }),
    ).toBe("6 ünite henüz atanmadı — 2 bize fazla atandı, 3 arsa sahibine kalmalı");
  });

  it("sıfır eksik/fazla olan taraf cümlede HİÇ GEÇMEZ", () => {
    expect(allocationUnassignedNote({ ...balance, our_missing_count: 0 })).toBe(
      "6 ünite henüz atanmadı — 3 arsa sahibine kalmalı",
    );
  });

  it("atanmamış ünite yokken not `null`dur ('0 ünite atanmadı' bir uyarı değildir)", () => {
    expect(allocationUnassignedNote({ ...balance, unassigned_count: 0 })).toBeNull();
  });

  it("PG 249 sözleşme gereği etiketi ORANDAN türer", () => {
    expect(allocationContractRequirementLabel("55.00")).toBe("Sözleşme gereği (Biz %55)");
    expect(allocationContractRequirementLabel("60.00")).toBe("Sözleşme gereği (Biz %60)");
  });

  it("🔴 PG 260 gerçekleşen oran — `null` iken `%0` DEĞİL, hesaplanamaz işareti", () => {
    expect(allocationActualRatioLabel("55.6", "44.4")).toBe("%55,6 / %44,4");
    expect(allocationActualRatioLabel(null, null)).toBe(ALLOCATION_UNCOMPUTABLE);
    expect(allocationActualRatioLabel("55.6", null)).toBe(ALLOCATION_UNCOMPUTABLE);
    expect(allocationActualRatioLabel(null, null)).not.toContain("0");
  });

  it("PG 96-99 hissedar seçeneği oranı OLDUĞU GİBİ basar (K2)", () => {
    expect(
      shareholderOptionLabel({
        shareholder_id: "sh-1",
        name: "Ahmet Yılmaz",
        share_pct: "50",
        unit_count: 10,
        value_total: "1",
      }),
    ).toBe("Ahmet Yılmaz (%50)");
  });

  it("PG 90 seçim rozeti ve sayfa etiketi çalışma zamanında kurulur", () => {
    expect(allocationSelectedBadge(6)).toBe("6 ünite seçili");
    expect(allocationPageLabel(2, 5)).toBe("Sayfa 2 / 5");
  });
});
