import { describe, it, expect } from "vitest";

import {
  documentTypeIcon,
  formatDocumentDate,
  formatDocumentSize,
} from "./document-format";

// Kanon: `projedesign/Şantiye - Belgeler.dc.html` (ŞB). Parantez içi sayılar o
// dosyanın SATIR numaralarıdır — beklenen çıktıların tamamı mockup metnidir.

describe("documentTypeIcon — uzantıdan türetilen tip ikonu (spec §3)", () => {
  it("pdf için 📄 basar (ŞB 96, 111, 121)", () => {
    expect(documentTypeIcon("Hakediş_5_Jul2026.pdf")).toBe("📄");
    expect(documentTypeIcon("Yapı_Ruhsatı_2025.PDF")).toBe("📄");
  });

  it("xlsx/xls için 📊 basar (ŞB 101, 126)", () => {
    expect(documentTypeIcon("Puantaj_Tem2026.xlsx")).toBe("📊");
    expect(documentTypeIcon("eski_metraj.xls")).toBe("📊");
  });

  it("jpg/jpeg/png için 🖼 basar (ŞB 106)", () => {
    expect(documentTypeIcon("Kat8_Beton_Foto.jpg")).toBe("🖼");
    expect(documentTypeIcon("saha.jpeg")).toBe("🖼");
    expect(documentTypeIcon("plan.png")).toBe("🖼");
  });

  it("dwg için 📐 basar (ŞB 116)", () => {
    expect(documentTypeIcon("Mimari_Proje_Rev3.dwg")).toBe("📐");
  });

  // ⚠️ Mockup KENDİ İÇİNDE tutarsız: ŞB 150'de `.zip` satırı 🖼 taşır. Spec §3
  // eşlemesi kazanır (zip 🗂) — bu bilinçli bir sapmadır, gözden kaçma değil.
  it("zip için 🗂 basar (spec §3 eşlemesi; ŞB 150'nin 🖼'ü mockup tutarsızlığı)", () => {
    expect(documentTypeIcon("Santiye_Foto_Tem2026.zip")).toBe("🗂");
  });

  it("bilinmeyen ve uzantısız adlar 📄'a düşer (spec §3)", () => {
    expect(documentTypeIcon("notlar.qqq")).toBe("📄");
    expect(documentTypeIcon("uzantisiz")).toBe("📄");
    expect(documentTypeIcon("")).toBe("📄");
  });

  it("adın içindeki noktalar son uzantıyı gölgelemez", () => {
    expect(documentTypeIcon("Günlük_Rapor_17.07.2026.pdf")).toBe("📄");
  });
});

describe("formatDocumentSize — mockup boyut metinleri (ŞB 98-128, 145-159)", () => {
  it("1 MB altını tam sayı KB olarak basar", () => {
    expect(formatDocumentSize(860160)).toBe("840 KB");
    expect(formatDocumentSize(250880)).toBe("245 KB");
    expect(formatDocumentSize(327680)).toBe("320 KB");
  });

  it("1 MB ve üstünü Türkçe ondalık ayırıcıyla MB olarak basar", () => {
    expect(formatDocumentSize(1258291)).toBe("1,2 MB");
    expect(formatDocumentSize(3565158)).toBe("3,4 MB");
    expect(formatDocumentSize(2202009)).toBe("2,1 MB");
    expect(formatDocumentSize(4404019)).toBe("4,2 MB");
    expect(formatDocumentSize(1887436)).toBe("1,8 MB");
  });

  it("tam MB değerlerinde sondaki sıfır atılır (ŞB 118, 152)", () => {
    expect(formatDocumentSize(18874368)).toBe("18 MB");
    expect(formatDocumentSize(50331648)).toBe("48 MB");
  });

  it("sıfır ve küçük dosyalar KB'a düşer (bilinmezlik değil, gerçek değer)", () => {
    expect(formatDocumentSize(0)).toBe("0 KB");
    expect(formatDocumentSize(512)).toBe("1 KB");
  });
});

// Mockup'ın "bugünü" 17 Temmuz 2026'dır (ŞB 144 "Bugün 15:30" satırı fikstürle
// eşleşir). Saat dilimi FORMATLAYICIDA sabitlenmiştir (Europe/Istanbul), bu
// yüzden test CI'ın TZ'sinden bağımsızdır.
const NOW = new Date("2026-07-17T13:00:00Z");

describe("formatDocumentDate — kart ve liste tarihleri (ŞB 98-128, 146-160)", () => {
  it("bugün yüklenen belge 'Bugün' basar (ŞB 98)", () => {
    expect(formatDocumentDate("2026-07-17T06:00:00Z", NOW)).toBe("Bugün");
  });

  it("dün yüklenen belge 'Dün' basar (ŞB 103)", () => {
    expect(formatDocumentDate("2026-07-16T06:00:00Z", NOW)).toBe("Dün");
  });

  it("aynı ayın diğer günleri 'gün ay' basar (ŞB 128 '10 Tem')", () => {
    expect(formatDocumentDate("2026-07-10T06:00:00Z", NOW)).toBe("10 Tem");
    expect(formatDocumentDate("2026-07-14T09:00:00Z", NOW)).toBe("14 Tem");
  });

  it("daha eski aylar 'ay yıl' basar (ŞB 113 'Mar 2025', 118 'Oca 2026')", () => {
    expect(formatDocumentDate("2025-03-10T06:00:00Z", NOW)).toBe("Mar 2025");
    expect(formatDocumentDate("2026-01-12T06:00:00Z", NOW)).toBe("Oca 2026");
  });

  it("withTime seçeneği bugünün saatini ekler (ŞB 146 'Bugün 15:30')", () => {
    expect(formatDocumentDate("2026-07-17T12:30:00Z", NOW, { withTime: true })).toBe(
      "Bugün 15:30",
    );
  });

  it("withTime yalnız 'Bugün' dalında saat ekler (ŞB 153 'Dün', 160 '14 Tem')", () => {
    expect(formatDocumentDate("2026-07-16T12:00:00Z", NOW, { withTime: true })).toBe("Dün");
    expect(formatDocumentDate("2026-07-14T09:00:00Z", NOW, { withTime: true })).toBe("14 Tem");
  });

  // Sabitlenmiş saat dilimi olmadan bu iki tarih CI'da (UTC) bir gün kayardı.
  it("gün sınırı Europe/Istanbul'a göre hesaplanır (CI TZ'sinden bağımsız)", () => {
    // 16 Temmuz 22:00 UTC = 17 Temmuz 01:00 TSİ → "Bugün"
    expect(formatDocumentDate("2026-07-16T22:00:00Z", NOW)).toBe("Bugün");
    // 15 Temmuz 22:00 UTC = 16 Temmuz 01:00 TSİ → "Dün"
    expect(formatDocumentDate("2026-07-15T22:00:00Z", NOW)).toBe("Dün");
  });
});
