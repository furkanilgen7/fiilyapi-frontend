import { createServer, type Server } from "node:http";

// exp'i uzak gelecekte olan sahte JWT (base64url payload).
function fakeJwt(): string {
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: "u1" })).toString("base64url");
  return `h.${payload}.s`;
}

const TOKEN_PAIR = { access_token: fakeJwt(), refresh_token: fakeJwt(), token_type: "bearer" };
const ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "patron@fiil.com",
  full_name: "Ahmet Yılmaz",
  title: "Patron",
  role_key: "patron",
  status: "active",
};

// Gercek FastAPI yerine gecen minik mock — hermetik E2E icin.
export function startMockBackend(port: number): { server: Server; close: () => Promise<void> } {
  const server = createServer((req, res) => {
    const url = req.url ?? "";
    const send = (status: number, body?: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    if (req.method === "POST" && url === "/auth/login") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        if (body.password === "wrong") return send(401, { detail: "invalid" });
        return send(200, TOKEN_PAIR);
      });
      return;
    }
    if (req.method === "POST" && url === "/auth/refresh") return send(200, TOKEN_PAIR);
    if (req.method === "GET" && url === "/auth/me") {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer ")) return send(401, { detail: "unauthenticated" });
      return send(200, ME);
    }
    return send(404);
  });
  server.listen(port);
  return {
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
