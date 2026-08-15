import { startMockBackend } from "./mock-backend";

// playwright.config webServer.env.BACKEND_URL ile ayni port.
//
// F-BLG T3: port ARTIK sabit degil, `MOCK_BACKEND_PORT` ile ezilebilir.
// Gerekce: ayni depoda PARALEL calisan ikinci bir sef kendi Playwright
// kosusunu kaldirdiginda iki sahte backend ayni portu ister ve ikincisi
// `EADDRINUSE` alir (ya da daha kotusu, BAYAT surece baglanir ve kosu SAHTE
// YESIL gecer). Varsayilan DEGISMEDI — `playwright.config.ts` ve CI aynen
// 4319'u kullanir.
const MOCK_PORT = Number(process.env.MOCK_BACKEND_PORT ?? 4319);

export default function globalSetup() {
  const mock = startMockBackend(MOCK_PORT);
  // Playwright globalSetup'tan donen fonksiyon teardown olarak calisir.
  return async () => {
    await mock.close();
  };
}
