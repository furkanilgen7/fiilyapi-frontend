// @vitest-environment node
// `invoices.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin
// testi. Stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i
// ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T6'nın işi). Amaç,
// E8'e bağlı ölçü/renk kararlarının sessizce silinmesine karşı regresyon
// korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./accounting.css", import.meta.url)), "utf8");

describe("accounting.css — E8'e bağlı kurallar", () => {
  it("dönem seçici + KPI şeridi TEK ızgaradır: `auto 1fr 1fr 1fr` (E8:72)", () => {
    expect(css).toMatch(/\.mu-strip\s*{[^}]*grid-template-columns:\s*auto 1fr 1fr 1fr/);
  });

  it("KPI değeri 20px kalın MONO'dur (E8:80)", () => {
    expect(css).toMatch(/\.mu-kpi__value\s*{[^}]*var\(--text-kpi-value\)/);
    expect(css).toMatch(/\.mu-kpi__value\s*{[^}]*var\(--font-mono\)/);
  });

  it("Toplam Borç KIRMIZI, Toplam Alacak YEŞİL (E8:80 · E8:84)", () => {
    expect(css).toMatch(/\.mu-kpi__value--danger\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.mu-kpi__value--success\s*{[^}]*var\(--color-success\)/);
  });

  it("defter hücreleri MONO; Borç kırmızı, Alacak yeşil, Bakiye NÖTR koyu (E8:115-116)", () => {
    expect(css).toMatch(/\.mu-table \.is-mono\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.mu-amount--debit\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.mu-amount--credit\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.mu-amount--balance\s*{[^}]*color:\s*var\(--color-text\)/);
  });

  it("boş taraf `—` SOLGUNdur, vurgulu değil (E8:114/123)", () => {
    expect(css).toMatch(/\.mu-table__empty-cell\s*{[^}]*var\(--color-text-subtle\)/);
  });

  it("tablo kartı 14px köşe + kart gölgesidir (E8:93)", () => {
    expect(css).toMatch(/\.mu-panel\s*{[^}]*border-radius:\s*var\(--radius-14\)/);
    expect(css).toMatch(/\.mu-panel\s*{[^}]*box-shadow:\s*var\(--shadow-card\)/);
  });

  it("geniş tablolar KENDİ kabında yatay kayar — sayfa gövdesi taşmaz", () => {
    expect(css).toMatch(/\.mu-table-scroll\s*{[^}]*overflow-x:\s*auto/);
  });

  it("devir bakiyesi bandı GÖRÜNÜR bir şerittir", () => {
    expect(css).toMatch(/\.mu-carried\s*{[^}]*background:\s*var\(--color-surface-2\)/);
    expect(css).toMatch(/\.mu-carried__value\s*{[^}]*var\(--font-mono\)/);
  });

  it("🔴 BEKÇİ: çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});

describe("accounting.css — HP'ye (Hesap Planı) bağlı kurallar", () => {
  it("dört SINIF bandının zemin/kenarlık/metin üçlüsü TOKEN'dan gelir", () => {
    const BANDS: Record<string, readonly string[]> = {
      "1": ["--color-nav-active-bg", "--color-primary-ring", "--color-primary-hover"],
      "2": ["--color-success-tint", "--color-success-tint-border", "--color-success-deep"],
      "3": ["--color-orange-tint", "--color-orange-tint-border", "--color-orange-tint-text"],
      "5": [
        "--color-purple-tint",
        "--color-accent-purple-line",
        "--color-accent-purple-deep",
      ],
    };
    for (const [klass, tokens] of Object.entries(BANDS)) {
      const rule = new RegExp(`\\.mu-chart__class--${klass}\\s*{([^}]*)}`).exec(css);
      expect(rule, `SINIF ${klass} kuralı yok`).not.toBeNull();
      for (const token of tokens) {
        expect(rule?.[1]).toContain(`var(${token})`);
      }
    }
  });

  it("🔴 çizilmemiş sınıf NÖTRdür — dördünün renklerini ödünç ALMAZ", () => {
    const neutral = /\.mu-chart__class--neutral\s*{([^}]*)}/.exec(css)?.[1] ?? "";
    expect(neutral).toContain("var(--color-surface-2)");
    for (const borrowed of [
      "--color-nav-active-bg",
      "--color-success-tint",
      "--color-orange-tint",
      "--color-purple-tint",
    ]) {
      expect(neutral).not.toContain(borrowed);
    }
  });

  it("kod girintisi 16px adımlıdır: level 2 = 32px (HP:76), level 3 = 48px", () => {
    expect(css).toMatch(
      /\.mu-chart__code--2\s*{[^}]*padding-left:\s*calc\(2 \* var\(--space-4\)\)/,
    );
    expect(css).toMatch(
      /\.mu-chart__code--3\s*{[^}]*padding-left:\s*calc\(3 \* var\(--space-4\)\)/,
    );
  });

  it("grup satırı gri zeminli ve KÜÇÜK/KALIN'dır (HP:71-73)", () => {
    expect(css).toMatch(/\.mu-chart__group td\s*{[^}]*background:\s*var\(--color-surface-2\)/);
    expect(css).toMatch(/\.mu-chart__group td\s*{[^}]*font-weight:\s*var\(--weight-bold\)/);
  });

  it("🔴 Durum noktası: aktif YEŞİL (HP:80), pasif GRİ (şef kararı)", () => {
    expect(css).toMatch(/\.mu-chart__dot--on\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.mu-chart__dot--off\s*{[^}]*var\(--color-border-strong\)/);
    // İkisi AYNI rengi almamalı — aksi hâlde `Durum` sütunu bilgi taşımazdı.
    expect(/\.mu-chart__dot--off\s*{[^}]*var\(--color-success\)/.test(css)).toBe(false);
  });

  it("bakiye tonları: yeşil (HP:79) / kırmızı (HP:155)", () => {
    expect(css).toMatch(/\.mu-chart__balance--success\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.mu-chart__balance--danger\s*{[^}]*var\(--color-danger\)/);
  });
});

describe("accounting.css — T4 diyalogları", () => {
  it("fiş diyaloğu varsayılan 480px kabuktan GENİŞtir (üç sütunlu satır tablosu)", () => {
    expect(css).toMatch(/\.mu-modal\s*{[^}]*width:\s*min\(760px, 92vw\)/);
  });

  /* İDDİA TAŞINDI (F-MUF T4): şerit eskiden `repeat(3, 1fr)` idi; mockup
     `M:196` durumu anlatan DÖRDÜNCÜ (ve ilk) hücreyi ekler. */
  it("denge şeridi M:196 ızgarasıdır: durum + Toplam Borç / Alacak / Fark", () => {
    expect(css).toMatch(/\.mu-balance\s*{[^}]*grid-template-columns:\s*1fr 190px 190px 210px/);
  });

  /* İDDİA TAŞINDI: ton artık TEK TEK değere değil ŞERİDİN KENDİSİNE
     uygulanır (M:195 kırmızı / M:223 yeşil) — değerler o bağlamdan boyanır. */
  it("🔴 denge DURUMU renkle ayrışır: dengeli yeşil, dengesiz kırmızı", () => {
    expect(css).toMatch(/\.mu-balance--ok\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.mu-balance--off\s*{[^}]*var\(--color-danger-tint\)/);
    expect(css).toMatch(
      /\.mu-balance--off \.mu-balance__state-title\s*{[^}]*var\(--color-danger-deep\)/,
    );
    expect(css).toMatch(
      /\.mu-balance--ok \.mu-balance__state-title\s*{[^}]*var\(--color-success-deep\)/,
    );
    // İkisi AYNI zemine düşerse şerit denge bilgisini TAŞIMAZ.
    expect(/\.mu-balance--off\s*{[^}]*var\(--color-success-tint\)/.test(css)).toBe(false);
  });

  /* 🔴 M:234/238 — DENGELİYKEN toplamlar nötr koyudur; renk DURUM taşır. */
  it("M:234 dengeli hâlde toplamlar NÖTR koyudur", () => {
    expect(css).toMatch(/\.mu-balance__value--neutral\s*{[^}]*color:\s*var\(--color-text\)/);
  });

  it("M:143/162 dolu taraf vurgulanır: borç kırmızı, alacak yeşil zemin", () => {
    expect(css).toMatch(/\.mu-line-amount--debit\.is-filled\s*{[^}]*var\(--color-danger-tint\)/);
    expect(css).toMatch(/\.mu-line-amount--credit\.is-filled\s*{[^}]*var\(--color-success-tint\)/);
    // Ters eşleşme satırın tarafını YANLIŞ anlatırdı.
    expect(/\.mu-line-amount--debit\.is-filled\s*{[^}]*var\(--color-success-tint\)/.test(css)).toBe(
      false,
    );
  });

  it("M:119/130 sıra numarası sütunu dar, ortalı ve MONO'dur", () => {
    expect(css).toMatch(/\.mu-lines__no\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.mu-lines__th-no,\s*\n\.mu-lines__no\s*{[^}]*width:\s*44px/);
  });

  it("M:122-123 kalem başlıkları: Borç KIRMIZI, Alacak YEŞİL", () => {
    expect(css).toMatch(/\.mu-lines__th--debit\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.mu-lines__th--credit\s*{[^}]*var\(--color-success\)/);
  });

  it("kapalı kaydet düğmesinin gerekçe listesi GÖRÜNÜR bir uyarı bandıdır", () => {
    expect(css).toMatch(/\.mu-blockers\s*{[^}]*var\(--color-danger-soft\)/);
  });
});

describe("accounting.css — F-MU2 · Mizan (MZ)", () => {
  it("🔴 kontrol banner'ının İKİ tonu da vardır ve AYNI rengi almazlar (K2)", () => {
    expect(css).toMatch(/\.mu-banner--ok\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.mu-banner--off\s*{[^}]*var\(--color-danger-soft\)/);
    // İkisi aynı zemine düşerse banner denge bilgisini TAŞIMAZ.
    expect(/\.mu-banner--off\s*{[^}]*var\(--color-success-tint\)/.test(css)).toBe(false);
  });

  it("1. RENK KATMANI — sütun başlıkları: Borç kırmızı, Alacak yeşil (MZ:71-76)", () => {
    expect(css).toMatch(/\.mu-tb__side--debit\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.mu-tb__side--credit\s*{[^}]*var\(--color-success\)/);
  });

  it("🔴 2. RENK KATMANI — gövdenin açılış/dönem hücreleri NÖTR ve NORMAL ağırlık (MZ:83)", () => {
    const plain = /\.mu-tb__plain\s*{([^}]*)}/.exec(css)?.[1] ?? "";
    expect(plain).toContain("var(--color-text)");
    expect(plain).toContain("var(--weight-regular)");
    // Defterin kırmızı/yeşil ikilisini ÖDÜNÇ ALMAZ — alsaydı MZ'nin kapanışa
    // verdiği vurgu kaybolurdu.
    expect(plain).not.toContain("--color-danger");
    expect(plain).not.toContain("--color-success");
  });

  it("4. RENK KATMANI — tfoot mavi zeminli, üstü 2px birincil çizgi, 700 (MZ:162-163)", () => {
    const foot = /\.mu-tb tfoot td\s*{([^}]*)}/.exec(css)?.[1] ?? "";
    expect(foot).toContain("var(--color-info-tint)");
    expect(foot).toContain("border-top: 2px solid var(--color-primary)");
    expect(foot).toContain("var(--weight-bold)");
  });

  it("MZ:168-169 — tfoot'un KAPANIŞ ikilisi öbür dört toplamdan büyüktür", () => {
    // 🔴 `td.` eki ŞART: eksik olursa kural `.mu-tb__foot td` ile EŞİT
    // özgüllükte kalır ve kazanan DEMET SIRASINA bağlı olur (F-BLG dersi).
    expect(css).toMatch(/\.mu-tb tfoot td\.mu-tb__cell--closing\s*{[^}]*font-size:\s*14px/);
  });

  it("🔴 ÜÇ özgüllük TIE'si de kapatıldı — kazanan DEMET SIRASINA bağlı DEĞİL", () => {
    // Her biri `.mu-table`/`.mu-tb` kardeşiyle EŞİT özgüllükte kalabilirdi;
    // eşitlikte kazanan yalnız kaynak sırasıdır (F-BLG dersi) ve bu, iki
    // katmanlı başlığın bütün görünümünü ŞANSA bağlardı.
    expect(css).toMatch(/\.mu-tb thead tr\.mu-tb__subhead th\s*{/);
    expect(css).toMatch(/\.mu-tb tfoot td\s*{/);
    expect(css).toMatch(/span\.mu-tb__total\s*{/);
    // Yalın (TIE bırakan) biçimleri geri sızmasın.
    expect(css).not.toMatch(/\n\.mu-tb__subhead th\s*{/);
    expect(css).not.toMatch(/\n\.mu-tb__foot td\s*{/);
    expect(css).not.toMatch(/\n\.mu-tb__total\s*{/);
  });

  it("MZ:55 — banner ikonu 18px'tir ve tonu metinden AYRIdır", () => {
    expect(css).toMatch(/\.mu-banner__icon\s*{[^}]*width:\s*18px/);
    expect(css).toMatch(/\.mu-banner--ok \.mu-banner__icon\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.mu-banner--off \.mu-banner__icon\s*{[^}]*var\(--color-danger\)/);
  });

  it("MZ:62 — iki başlık katmanı ARASINDAKİ çizgi 2px'tir", () => {
    expect(css).toMatch(/\.mu-tb thead tr:first-child th\s*{[^}]*border-bottom-width:\s*2px/);
  });
});

describe("accounting.css — F-MU2 · KDV Beyannamesi", () => {
  it("KDV:54 · :72 — üç kart ve İKİ panel kendi ızgaralarındadır", () => {
    expect(css).toMatch(/\.mu-vat-cards\s*{[^}]*grid-template-columns:\s*1fr 1fr 1fr/);
    expect(css).toMatch(/\.mu-vat-grid\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
  });

  it("🔴 K1 — vurgu kartının İKİ tonu vardır ve AYNI paleti paylaşmazlar", () => {
    expect(css).toMatch(/\.mu-vat-card--payable\s*{[^}]*var\(--color-orange-tint\)/);
    expect(css).toMatch(/\.mu-vat-card--carried\s*{[^}]*var\(--color-success-tint\)/);
    // Turuncu = devlete borç, yeşil = devletten alacak; ikisi aynı zemine
    // düşerse paranın YÖNÜ ekrandan okunamaz.
    expect(/\.mu-vat-card--carried\s*{[^}]*var\(--color-orange-tint\)/.test(css)).toBe(false);
  });

  it("🔴 K1 — sonuç şeridinin İKİ tonu da 2px üst çizgi taşır (KDV:135)", () => {
    expect(css).toMatch(/\.mu-vat-result\s*{[^}]*border-top:\s*2px solid transparent/);
    expect(css).toMatch(/\.mu-vat-result--payable\s*{[^}]*var\(--color-warning\)/);
    expect(css).toMatch(/\.mu-vat-result--carried\s*{[^}]*var\(--color-success\)/);
  });

  it("KDV:91-95 — istisna satırı SOLGUN ve İTALİKtir", () => {
    expect(css).toMatch(/\.mu-vat-exempt td\s*{[^}]*var\(--color-text-subtle\)/);
    expect(css).toMatch(/\.mu-vat-exempt td:first-child\s*{[^}]*font-style:\s*italic/);
  });

  it("KDV:96 · :126 — iki toplam satırı FARKLI zemin taşır (mavi ↔ yeşil)", () => {
    expect(css).toMatch(/\.mu-vat-total--calculated td\s*{[^}]*var\(--color-info-tint\)/);
    expect(css).toMatch(/\.mu-vat-total--deduction td\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.mu-vat-total--calculated \.mu-vat-total__accent\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.mu-vat-total--deduction \.mu-vat-total__accent\s*{[^}]*var\(--color-success\)/);
  });

  it("ızgaradaki paneller kendi alt boşluklarını TAŞIMAZ (boşluğu `gap` verir)", () => {
    expect(css).toMatch(/\.mu-vat-grid \.mu-panel\s*{[^}]*margin-bottom:\s*0/);
  });

  it("🔴 hücre punto'ları MOCKUP'IN ölçüleridir; özgüllük TIE bırakmaz", () => {
    // MZ:81/83 · KDV:85-88 — gövde 12px (E8'in 13px'i DEĞİL).
    expect(css).toMatch(/\.mu-tb td\s*{[^}]*font-size:\s*12px/);
    expect(css).toMatch(/\.mu-vat-table td\s*{[^}]*font-size:\s*12px/);
    // MZ:82 — yalnız `Hesap Adı` 13px; KDV:100 — yalnız toplamın vergi
    // hücresi 13px. İkisi de `td.` ekiyle yazılır, yoksa yukarıdaki
    // (0,1,1) kuralları onları EZERDİ.
    expect(css).toMatch(/\.mu-tb td\.mu-tb__name\s*{[^}]*var\(--text-body\)/);
    // MZ:83-88 · :81-82 — iç boşluk da MZ'nindir (E8'in 16px'i DEĞİL).
    expect(css).toMatch(/\.mu-tb td\s*{[^}]*padding:\s*10px var\(--space-3\)/);
    expect(css).toMatch(/\.mu-vat-table td\s*{[^}]*padding:\s*10px 10px/);
    expect(css).toMatch(/\.mu-vat-table td\.mu-vat-total__accent\s*{[^}]*var\(--text-body\)/);
  });

  it("🔴 KDV ızgarası `align-items` BİLDİRMEZ — mockup da bildirmiyor (KDV:72)", () => {
    // Yorum GÖVDESİ hariç tutulur: kuralın kendi gerekçe metni "align-items"
    // sözcüğünü AÇIKÇA içerir ve bu bir bildirim değildir.
    const grid = (/\.mu-vat-grid\s*{([^}]*)}/.exec(css)?.[1] ?? "").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    expect(grid).toContain("grid-template-columns");
    expect(grid).not.toContain("align-items");
  });
});
