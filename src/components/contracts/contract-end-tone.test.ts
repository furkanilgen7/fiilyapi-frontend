import { describe, it, expect } from "vitest";

import {
  CONTRACT_END_SOON_DAYS,
  contractEndTone,
  type ContractEndTone,
} from "./contract-end-tone";

/**
 * F-SZLEKR T1 · E14 "Bitiş Tarihi" metriğinin TONU.
 *
 * Sabit "bugün": 2026-08-27. `today` parametredir, bu yüzden bu dosyada
 * hiçbir vaka takvime bakmaz — testler yıllar sonra da aynı sonucu verir.
 */
const TODAY = new Date(2026, 7, 27); // 2026-08-27 (yerel gün)

/** Yerel takvimde `TODAY`den `offset` gün ötesinin `YYYY-MM-DD` hâli. */
function isoDayOffset(offset: number): string {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toneAt(offset: number): ContractEndTone {
  return contractEndTone(isoDayOffset(offset), TODAY);
}

describe("contractEndTone", () => {
  it("eşik adlandırılmıştır ve 30 gündür (satınalmanın 7'sinden AYRI büyüklük)", () => {
    expect(CONTRACT_END_SOON_DAYS).toBe(30);
  });

  it("tarih yoksa NÖTRDÜR (— basılır, kırmızı değil)", () => {
    expect(contractEndTone(null, TODAY)).toBe("neutral");
  });

  it("çözülemeyen tarih NÖTRDÜR (sessiz kırmızı yok)", () => {
    expect(contractEndTone("", TODAY)).toBe("neutral");
  });

  // ── GEÇMİŞ ────────────────────────────────────────────────────────────────
  it("dün biten sözleşme KIRMIZIDIR (-1)", () => {
    expect(toneAt(-1)).toBe("danger");
  });

  it("bir yıl önce biten sözleşme KIRMIZIDIR (-365)", () => {
    expect(toneAt(-365)).toBe("danger");
  });

  // ── YAKLAŞAN ──────────────────────────────────────────────────────────────
  it("BUGÜN biten sözleşme KEHRİBARDIR (0) — henüz geçmiş değildir", () => {
    expect(toneAt(0)).toBe("warning");
  });

  it("yarın biten sözleşme KEHRİBARDIR (+1)", () => {
    expect(toneAt(1)).toBe("warning");
  });

  it("+29 gün KEHRİBARDIR", () => {
    expect(toneAt(29)).toBe("warning");
  });

  /**
   * 🔴 MUTASYON BEKÇİSİ (iki komşu kare). +30 DÂHİLDİR, +31 değildir.
   * `<=` → `<` mutasyonu +30'u, eşiğin 30 → 31 mutasyonu +31'i düşürür.
   * Sayılar burada ÇIPLAK yazılır ve `CONTRACT_END_SOON_DAYS`e BAĞLANMAZ:
   * sabite bağlanan bir iddia eşik mutasyonuyla BİRLİKTE kayar ve mutantı
   * hayatta bırakırdı (ölçüldü: eşik 31'e çekilince yalnız sabitin kendi
   * testi düşüyordu, davranış testi değil).
   */
  it("+30 gün KEHRİBARDIR — SINIR DÂHİLDİR", () => {
    expect(toneAt(30)).toBe("warning");
  });

  it("+31 gün NÖTRDÜR — sınırın bir gün ötesi", () => {
    expect(toneAt(31)).toBe("neutral");
  });

  it("uzak gelecek NÖTRDÜR (+400)", () => {
    expect(toneAt(400)).toBe("neutral");
  });

  /**
   * 🔴 `today` GERÇEKTEN OKUNUYOR MU? Aynı tarih, İKİ ayrı "bugün" ile üç
   * farklı ton verir. `today` sabitle değiştirilirse (mutasyon) bu düşer.
   */
  it("aynı tarih farklı 'bugün'lerde farklı ton verir", () => {
    const END = "2026-12-01";
    expect(contractEndTone(END, new Date(2026, 11, 2))).toBe("danger"); // 02.12 → geçti
    expect(contractEndTone(END, new Date(2026, 10, 15))).toBe("warning"); // 15.11 → 16 gün
    expect(contractEndTone(END, new Date(2026, 7, 27))).toBe("neutral"); // 27.08 → 96 gün
  });
});
