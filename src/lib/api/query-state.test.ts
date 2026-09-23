import { describe, it, expect, vi } from "vitest";

import { isLoaded, resolveLookup } from "./query-state";

describe("isLoaded — 'yüklendi' ölçütünün TEK tanımı", () => {
  it("yüklenmiyor ve hatasızken true döner", () => {
    expect(isLoaded({ isLoading: false, isError: false })).toBe(true);
  });

  it("hâlâ yükleniyorken false döner", () => {
    expect(isLoaded({ isLoading: true, isError: false })).toBe(false);
  });

  it("hataya düştüğünde de false döner — SINIF KUSURUNUN bekçisi", () => {
    // Bu, kaynağın kuyruktaki asıl kusuruydu: `!isLoading` tek başına
    // hata durumunu "yüklendi" sanıyordu (fail-open).
    expect(isLoaded({ isLoading: false, isError: true })).toBe(false);
  });
});

describe("resolveLookup — üç durumlu şantiye/atama çözücüsü", () => {
  const lookup = (id: string) => (id === "site-1" ? "Güneşkent A-Blok" : undefined);

  it("id null ise atama yok demektir — null döner", () => {
    expect(resolveLookup(null, { isLoading: false, isError: false }, lookup)).toBeNull();
  });

  it("kaynak yükleniyorsa nötr (undefined) döner, YANLIŞ 'yok' BASILMAZ", () => {
    expect(resolveLookup("site-1", { isLoading: true, isError: false }, lookup)).toBeUndefined();
  });

  it("kaynak hataya düşmüşse de nötr (undefined) döner — fail-open YASAK", () => {
    expect(resolveLookup("site-1", { isLoading: false, isError: true }, lookup)).toBeUndefined();
  });

  it("kaynak yüklendi ve id haritada varsa değeri döner", () => {
    expect(resolveLookup("site-1", { isLoading: false, isError: false }, lookup)).toBe(
      "Güneşkent A-Blok",
    );
  });

  it("kaynak yüklendi ama id haritada YOKSA null döner (bulunamadı)", () => {
    expect(resolveLookup("site-9", { isLoading: false, isError: false }, lookup)).toBeNull();
  });

  it("lookup fonksiyonu id null iken HİÇ çağrılmaz", () => {
    const spy = vi.fn();
    resolveLookup(null, { isLoading: false, isError: false }, spy);
    expect(spy).not.toHaveBeenCalled();
  });
});
