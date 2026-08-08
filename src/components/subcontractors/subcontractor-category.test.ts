import { describe, it, expect } from "vitest";

import { categoryBadgeVariant, categoryTone } from "./subcontractor-category";

describe("subcontractor-category · rozet renk haritası (TL 57/67/77/87/97)", () => {
  it("mockup'taki beş kategoriyi kendi tonuna eşler", () => {
    expect(categoryTone("Betonarme")).toBe("primary"); // 57
    expect(categoryTone("Elektrik")).toBe("warning"); // 67
    expect(categoryTone("Mekanik")).toBe("purple"); // 77
    expect(categoryTone("Doğrama")).toBe("success"); // 87
    expect(categoryTone("Sıhhi")).toBe("purple"); // 97
  });

  it("büyük/küçük harf ve boşluk duyarsızdır", () => {
    expect(categoryTone("  betonarme ")).toBe("primary");
    expect(categoryTone("ELEKTRİK")).toBe("warning");
  });

  it("haritada OLMAYAN kategori nötr tona düşer — renk icat edilmez", () => {
    expect(categoryTone("Peyzaj")).toBe("neutral");
    expect(categoryTone("Tesisat")).toBe("neutral");
    expect(categoryTone(null)).toBe("neutral");
    expect(categoryTone("")).toBe("neutral");
  });

  it("mor Badge varyantı olmadığı için nötr taban kullanılır", () => {
    expect(categoryBadgeVariant("purple")).toBe("neutral");
    expect(categoryBadgeVariant("primary")).toBe("primary");
    expect(categoryBadgeVariant("success")).toBe("success");
  });
});
