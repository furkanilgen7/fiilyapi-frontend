import { describe, expect, it } from "vitest";

import {
  COZULEMEYEN_EKRANLAR,
  EKRAN_ANAHTARLARI,
  ekranSebebi,
  ekranYolu,
} from "./ai-screen-routes";

/**
 * 🔴 İKİ DEPO ARASINDAKİ SÖZLEŞMENİN TEK BEKÇİSİ.
 *
 * Backend'in `EkranAnahtari` enum'u AYRI BİR GİT DEPOSUNDADIR; `routes.ts`ten
 * türetilemez ve tersi de doğrudur. Bugüne kadar iki kümenin eşitliğini ölçen
 * **hiçbir şey yoktu**: backend'e yeni bir ekran eklenirse `navigate_to` onu
 * önerir, frontend yolu bulamaz ve kullanıcı ölü bir düğmeye tıklardı.
 *
 * ⚠️ DÜRÜSTLÜK: bu test backend'in enum'unu **okuyamaz** (başka depo). Ölçtüğü
 * şey, frontend'in ilan ettiği kümenin İÇ TUTARLILIĞIDIR: her anahtar ya bir
 * yola ya da yazılı bir sebebe çözülür; sessiz bir üçüncü hâl yoktur. Backend
 * tarafındaki ikizi `test_ai0b_navigation.py`dir.
 */

describe("ai-screen-routes", () => {
  it("HER anahtar ya bir YOLA ya da yazili bir SEBEBE cozulur", () => {
    for (const anahtar of EKRAN_ANAHTARLARI) {
      const yol = ekranYolu(anahtar);
      if (yol === null) {
        // 🔴 Sessiz üçüncü hâl YOK: sebep AÇIKÇA yazılı olmalı.
        expect(COZULEMEYEN_EKRANLAR[anahtar], `${anahtar} sebepsiz çözülemiyor`).toBeTruthy();
        expect(ekranSebebi(anahtar)).toBe(COZULEMEYEN_EKRANLAR[anahtar]);
      } else {
        expect(yol.startsWith("/"), `${anahtar} → ${yol}`).toBe(true);
      }
    }
  });

  it("cozulemeyen kume TAM OLARAK ikidir ve ADIYLA yazilidir", () => {
    // Sayı değişirse bu test kırmızı olur ve birinin gerekçeyi YENİDEN ÖLÇMESİ
    // gerekir (K-BAYAT GEREKÇE: "uç yok" gerekçesi bayatlar).
    expect(Object.keys(COZULEMEYEN_EKRANLAR).sort()).toEqual([
      "santiye_gunlugu",
      "santiyeler",
    ]);
  });

  it("TANINMAYAN anahtar TAHMIN URETMEZ", () => {
    // 🔴 Backend yeni bir üye eklerse kullanıcı ölü bir bağlantı değil,
    // sebebi yazan kapalı bir düğme görür.
    expect(ekranYolu("ayarlar_izin_matrisi")).toBeNull();
    expect(ekranYolu("")).toBeNull();
    expect(ekranSebebi("uydurma")).toContain("rotası henüz yok");
  });

  it("HICBIR anahtar bir AYAR/EYLEM yuzeyine cozulmez", () => {
    // `navigate_to` vekâleten yazma aracına DÖNÜŞEMEZ (S22).
    for (const anahtar of EKRAN_ANAHTARLARI) {
      const yol = ekranYolu(anahtar);
      if (yol === null) continue;
      for (const yasak of ["/onayla", "/gonder", "/ode", "/sil", "/duzenle", "/yeni"]) {
        expect(yol.includes(yasak), `${anahtar} → ${yol}`).toBe(false);
      }
    }
    // Tek istisna `ayarlar` kökü: bir LİSTE ekranıdır, bir eylem yüzeyi değil.
    expect(ekranYolu("ayarlar")).toBe("/ayarlar");
    expect(ekranYolu("ayarlar")).not.toContain("izin-matrisi");
  });

  it("mockup'in KAYNAK rozetlerinin anahtarlari COZULUR", () => {
    // Mockup 206-209 / 303-305: Hakediş Kayıtları · Taşeron Hakedişleri ·
    // Nakit Akışı · Şantiye Stok · Haftalık Plan.
    //
    // 🔴 ÖLÇÜLDÜ — bu test bir zamanlar mockup DOSYASINI okuyordu ve CI'da
    // ENOENT ile düştü: `projedesign/` İKİ DEPONUN DA İÇİNDE DEĞİLDİR
    // (yalnız yerel çalışma ağacında yan yana duruyorlar). Yani hiçbir birim
    // testi mockup'la karşılaştırma yapamaz; mockup birebirliğinin TEK bekçisi
    // Linux CI'da üretilen GÖRSEL BASELINE'lardır (`asistan-visual.spec.ts`).
    // Burada ölçülen şey yalnız anahtarların çözülebildiğidir.
    for (const anahtar of ["hakedisler", "hazine", "stok", "puantaj"]) {
      expect(ekranYolu(anahtar), anahtar).not.toBeNull();
    }
    // Mockup'ın "Haftalık Plan" rozeti `santiye_gunlugu` altındadır → çözülemez
    // ve sebebi YAZILI. Sessiz bir ölü bağlantı DEĞİL.
    expect(ekranYolu("santiye_gunlugu")).toBeNull();
    expect(ekranSebebi("santiye_gunlugu")).toContain("tek başına bir ekranı yok");
  });
});
