// @vitest-environment node
//
// KAYIT 402 · 🔴 BU KAYDIN ONARIM TARİFİ YANLIŞTI; bekçi TERSİNE çevrildi.
//
// Kayıt şunu doğru teşhis etmişti: görsel kapı gri→gri metin geçişlerini
// kaçırıyor (`e2e/takvim.spec.ts:15-18` bunu kendi yorumunda kabul eder:
// "bir yüzeyin ölüden canlıya geçtiğini kare KANITLAMAZ; kanıt DOM'dan gelir").
// Ama önerdiği çözüm — `playwright.config.ts`e küresel
// `expect.toHaveScreenshot.maxDiffPixelRatio: 0.01` eklemek — TERS YÖNDE:
//
//   · Playwright'ın varsayılanında `maxDiffPixelRatio`/`maxDiffPixels` YOKTUR,
//     yani "kaç piksel farklı olabilir" sınırı SIFIRDIR. Kaçırılan gri→gri
//     geçişinin sebebi bu değil, per-piksel RENK toleransı olan
//     `threshold: 0.2`dir.
//   · Küresel `maxDiffPixelRatio: 0.01` eklemek 1280×900 viewport'ta kare
//     başına 11.520 piksellik farkı GÖRMEZDEN GELDİRİR ve o güne dek
//     varsayılanla ölçülen 166 kareyi GEVŞETİR.
//
// Yani öneri kapıyı sıkılaştırmaz, delik açar. Uygulanmış hâli geri alındı.
// Kaydın gerçek çözümü `threshold`u düşürmektir; bu 167 karenin hepsini
// yeniden ölçmeyi (Playwright koşusu) gerektirir ve bu turda YAPILMADI.
//
// Bu bekçi o yüzden tersini iddia eder: küresel bir piksel-oranı toleransı
// config'e GİRMEMELİDİR. Tek tek spec'ler kendi override'ını taşıyabilir
// (`e2e/visual.spec.ts:34` bilinçli istisnadır).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const configPath = fileURLToPath(new URL("../../playwright.config.ts", import.meta.url));

describe("playwright.config.ts · küresel görsel eşik (kayıt 402)", () => {
  it("küresel `maxDiffPixelRatio` toleransı TAŞIMAZ (166 kareyi gevşetirdi)", () => {
    const content = readFileSync(configPath, "utf-8");
    expect(content).not.toMatch(
      /expect\s*:\s*\{[^}]*toHaveScreenshot\s*:\s*\{[^}]*maxDiffPixel/s,
    );
  });
});
