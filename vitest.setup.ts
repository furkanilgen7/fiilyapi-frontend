import "@testing-library/jest-dom/vitest";

// Node'un yerleşik `Request` sınıfı (undici) göreli URL'leri kabul etmez; tarayıcıda
// `backendClient`/`apiClient` göreli baseUrl (`/api/...`) ile document konumuna göre
// çözülür. Testlerde bu davranışı taklit etmek için göreli girişleri sabit bir
// origin'e göre çözüyoruz (yalnızca test ortamı, uygulama kodu değişmiyor).
const OriginalRequest = globalThis.Request;

class TestRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === "string" && input.startsWith("/")) {
      super(new URL(input, "http://localhost"), init);
    } else {
      super(input, init);
    }
  }

  // `String(request)` normalde spesifikasyona göre "[object Request]" döner;
  // `fetch` mock'larında URL'e göre dallanan testler (`String(input).includes(...)`)
  // bu yüzden çalışmaz. Test ortamında `.url`'i döndürerek bunu düzeltiyoruz.
  toString(): string {
    return this.url;
  }
}

globalThis.Request = TestRequest as unknown as typeof Request;
