import { startMockBackend } from "./mock-backend";

// playwright.config webServer.env.BACKEND_URL ile ayni port.
const MOCK_PORT = 4319;

export default function globalSetup() {
  const mock = startMockBackend(MOCK_PORT);
  // Playwright globalSetup'tan donen fonksiyon teardown olarak calisir.
  return async () => {
    await mock.close();
  };
}
