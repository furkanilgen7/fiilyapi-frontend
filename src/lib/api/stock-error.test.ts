import { describe, it, expect } from "vitest";

import { stockErrorMessage } from "./stock-error";
import { BackendError } from "./unwrap";

// F-ST T1 · ST backend spec §4b kanonu: gövde içi VARLIK referansı = 404,
// biçim/kural ihlali = 422. İkisi de Türkçe ve GÖRÜNÜR basılır.
describe("stockErrorMessage", () => {
  it("404 govdesindeki Turkce detay AYNEN basilir", () => {
    const message = stockErrorMessage(new BackendError(404, { detail: "Depo bulunamadı." }));

    expect(message).toBe("Depo bulunamadı.");
  });

  it("422 govdesindeki Turkce detay AYNEN basilir", () => {
    const message = stockErrorMessage(new BackendError(422, { detail: "Miktar sıfır olamaz." }));

    expect(message).toBe("Miktar sıfır olamaz.");
  });

  // Gövde okunamadığında bile kullanıcı SESSİZ bırakılmaz — duruma özgü
  // Türkçe yedek metin basılır.
  it("govdesi okunamayan 404 icin varlik yedegi basilir", () => {
    const message = stockErrorMessage(new BackendError(404, null));

    expect(message).toContain("bulunamadı");
  });

  it("govdesi okunamayan 422 icin kural yedegi basilir", () => {
    const message = stockErrorMessage(new BackendError(422, null));

    expect(message).toContain("kurallara uymuyor");
  });

  it("403 icin yetki metni basilir", () => {
    const message = stockErrorMessage(new BackendError(403, null));

    expect(message).toBe("Bu işlem için yetkiniz yok.");
  });

  it("BackendError olmayan hata icin genel yedek basilir", () => {
    const message = stockErrorMessage(new Error("ag koptu"));

    expect(message).toBe("Beklenmeyen bir hata oluştu.");
  });
});
