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
