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

interface MockState {
  users: Array<{ id: string; email: string; full_name: string; title: string; role_id: string; status: string }>;
  roles: Array<{ id: string; key: string; name: string; emoji: string; description: string; is_system: boolean }>;
  modules: Array<{ id: string; key: string; name: string; group: string; sort_order: number }>;
  projects: Array<{ id: string; code: string; name: string; status: string; budget: string; progress_pct: string }>;
  permissions: Record<string, Record<string, { access_level: string; scope: string }>>;
  projectAccess: Record<string, { all_projects: boolean; project_ids: string[] }>;
  company: {
    id: string;
    name: string | null;
    tax_number: string | null;
    tax_office: string | null;
    trade_registry_no: string | null;
    kep_address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    brand_color: string;
    gib_integration_code: string | null;
    earsiv_portal: string | null;
    default_vat_rate: string;
    auto_einvoice: boolean;
    has_logo: boolean;
    logo_url: string;
  };
  preferences: {
    locale: string;
    currency: string;
    date_format: string;
    density: string;
    theme: string;
    accent_color: string;
  };
  notifications: Array<{ event_key: string; label: string; email: boolean; in_app: boolean; sms: boolean }>;
}

function seedState(): MockState {
  // Gerçek backend seed'iyle hizalı (bkz. backend/app/modules/roles/seed_data.py):
  // aynı rol/modül anahtarları, isimleri, gruplar ve sıralama.
  const roles = [
    { id: "role-admin", key: "system_admin", name: "Sistem Yöneticisi", emoji: "🛡️", description: "Tüm modüller · Tüm projeler · Ayarlar · Kullanıcı yönetimi · Silme yetkisi", is_system: true },
    { id: "role-patron", key: "patron", name: "Patron", emoji: "👔", description: "Tüm modüller · Tüm projeler (ayarlar hariç)", is_system: true },
    { id: "role-saha", key: "site_chief", name: "Şantiye Şefi", emoji: "👷", description: "Günlük kayıt, puantaj, stok görüntüle", is_system: false },
  ];
  const modules = [
    { id: "m-dashboard", key: "dashboard", name: "Gösterge Paneli", group: "GENEL", sort_order: 1 },
    { id: "m-approvals", key: "approvals", name: "Onay Kutusu", group: "GENEL", sort_order: 2 },
    { id: "m-site-diary", key: "site_diary", name: "Günlük Kayıt", group: "SAHA", sort_order: 3 },
    { id: "m-timesheet", key: "timesheet", name: "Puantaj", group: "SAHA", sort_order: 4 },
    { id: "m-personnel", key: "personnel", name: "Personel", group: "SAHA", sort_order: 5 },
    { id: "m-payroll", key: "payroll", name: "Bordro", group: "SAHA", sort_order: 6 },
    { id: "m-inventory", key: "inventory", name: "Stok & Depo", group: "STOK_SATINALMA", sort_order: 7 },
    { id: "m-procurement", key: "procurement", name: "Satınalma & Teklif", group: "STOK_SATINALMA", sort_order: 8 },
    { id: "m-progress-payments", key: "progress_payments", name: "Hakedişler", group: "MALI", sort_order: 9 },
    { id: "m-accounting", key: "accounting", name: "Muhasebe", group: "MALI", sort_order: 10 },
    { id: "m-treasury", key: "treasury", name: "Hazine", group: "MALI", sort_order: 11 },
    { id: "m-settings", key: "settings", name: "Ayarlar", group: "SISTEM", sort_order: 12 },
    { id: "m-user-management", key: "user_management", name: "Kullanıcı & Rol Yönetimi", group: "SISTEM", sort_order: 13 },
  ];
  const permissions: MockState["permissions"] = {
    "role-admin": Object.fromEntries(modules.map((m) => [m.key, { access_level: "admin", scope: "all" }])),
    "role-patron": Object.fromEntries(modules.map((m) => [m.key, { access_level: "full", scope: "all" }])),
    "role-saha": Object.fromEntries(modules.map((m) => [m.key, { access_level: "none", scope: "all" }])),
  };
  return {
    users: [
      { id: "u-1", email: "patron@fiil.com", full_name: "Ahmet Yılmaz", title: "Patron", role_id: "role-patron", status: "active" },
      { id: "u-2", email: "saha@fiil.com", full_name: "Mehmet Demir", title: "Şantiye Şefi", role_id: "role-saha", status: "active" },
    ],
    roles,
    modules,
    projects: [
      { id: "p-1", code: "PRJ-1", name: "Kule A", status: "active", budget: "1000000", progress_pct: "20" },
      { id: "p-2", code: "PRJ-2", name: "Villa B", status: "active", budget: "500000", progress_pct: "40" },
    ],
    permissions,
    projectAccess: {
      "u-1": { all_projects: true, project_ids: [] },
      "u-2": { all_projects: false, project_ids: ["p-1"] },
    },
    company: {
      id: "company-1",
      name: "FİİL Yapı Ltd. Şti.",
      tax_number: "1234567890",
      tax_office: null,
      trade_registry_no: null,
      kep_address: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      brand_color: "#2563eb",
      gib_integration_code: null,
      earsiv_portal: null,
      default_vat_rate: "20.00",
      auto_einvoice: false,
      has_logo: false,
      logo_url: "",
    },
    preferences: {
      locale: "tr",
      currency: "TRY",
      date_format: "DD.MM.YYYY",
      density: "normal",
      theme: "light",
      accent_color: "#2563eb",
    },
    notifications: [
      { event_key: "progress_payment_created", label: "Hakediş oluşturuldu", email: true, in_app: true, sms: false },
      { event_key: "progress_payment_approved", label: "Hakediş onaylandı", email: true, in_app: true, sms: false },
      { event_key: "vat_due_soon", label: "KDV ödemesi yaklaşıyor", email: true, in_app: true, sms: false },
      { event_key: "purchase_approval_pending", label: "Satınalma onay bekliyor", email: false, in_app: true, sms: false },
      { event_key: "stock_low", label: "Stok kritik seviyede", email: false, in_app: true, sms: false },
      { event_key: "payroll_payday", label: "Bordro ödeme günü", email: true, in_app: true, sms: false },
      { event_key: "daily_log_missing", label: "Günlük kayıt girilmedi", email: false, in_app: true, sms: false },
    ],
  };
}

// Gercek FastAPI yerine gecen minik mock — hermetik E2E icin.
export function startMockBackend(port: number): { server: Server; close: () => Promise<void> } {
  const state = seedState();

  const server = createServer((req, res) => {
    const rawUrl = req.url ?? "";
    const parsed = new URL(rawUrl, "http://mock");
    const path = parsed.pathname;
    const method = req.method ?? "GET";

    const send = (status: number, body?: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };

    // Auth uclari (Bearer gerektirmez)
    if (method === "POST" && path === "/auth/login") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        if (body.password === "wrong") return send(401, { detail: "invalid" });
        return send(200, TOKEN_PAIR);
      });
      return;
    }
    if (method === "POST" && path === "/auth/refresh") return send(200, TOKEN_PAIR);

    // Bundan sonrasi Bearer gerektirir
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) return send(401, { detail: "unauthenticated" });

    if (method === "GET" && path === "/auth/me") return send(200, ME);

    // Govde okuma yardimcisi
    const withBody = (handler: (body: Record<string, unknown>) => void) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => handler(JSON.parse(raw || "{}")));
    };

    // /modules, /projects, /roles listeleri
    if (method === "GET" && path === "/modules") return send(200, state.modules);
    if (method === "GET" && path === "/projects") return send(200, state.projects);
    if (method === "GET" && path === "/roles") return send(200, state.roles);

    if (method === "POST" && path === "/roles") {
      return withBody((body) => {
        const role = {
          id: `role-${state.roles.length + 1}`,
          key: String(body.key ?? ""),
          name: String(body.name ?? ""),
          emoji: String(body.emoji ?? ""),
          description: String(body.description ?? ""),
          is_system: false,
        };
        state.roles.push(role);
        state.permissions[role.id] = Object.fromEntries(state.modules.map((m) => [m.key, { access_level: "none", scope: "all" }]));
        return send(201, role);
      });
    }

    // /roles/{id}/permissions
    const permListMatch = path.match(/^\/roles\/([^/]+)\/permissions$/);
    if (method === "GET" && permListMatch) {
      const roleId = permListMatch[1];
      const map = state.permissions[roleId] ?? {};
      const cells = Object.entries(map).map(([module_key, v]) => ({ module_key, access_level: v.access_level, scope: v.scope }));
      return send(200, cells);
    }

    // /roles/{id}/permissions/{module_key}
    const permCellMatch = path.match(/^\/roles\/([^/]+)\/permissions\/([^/]+)$/);
    if (method === "PUT" && permCellMatch) {
      const [, roleId, moduleKey] = permCellMatch;
      return withBody((body) => {
        state.permissions[roleId] = state.permissions[roleId] ?? {};
        const cell = { access_level: String(body.access_level), scope: String(body.scope) };
        state.permissions[roleId][moduleKey] = cell;
        return send(200, { module_key: moduleKey, access_level: cell.access_level, scope: cell.scope });
      });
    }

    // /roles/{id} PATCH/DELETE
    const roleIdMatch = path.match(/^\/roles\/([^/]+)$/);
    if (roleIdMatch && method === "PATCH") {
      const roleId = roleIdMatch[1];
      return withBody((body) => {
        const role = state.roles.find((r) => r.id === roleId);
        if (!role) return send(404, { detail: "rol yok" });
        role.name = String(body.name ?? role.name);
        role.emoji = String(body.emoji ?? role.emoji);
        role.description = String(body.description ?? role.description);
        return send(200, role);
      });
    }
    if (roleIdMatch && method === "DELETE") {
      const roleId = roleIdMatch[1];
      state.roles = state.roles.filter((r) => r.id !== roleId);
      return send(204);
    }

    // /users list + create
    if (method === "GET" && path === "/users") {
      const limit = Number(parsed.searchParams.get("limit") ?? "20");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const items = state.users.slice(offset, offset + limit);
      return send(200, { items, total: state.users.length, limit, offset });
    }
    if (method === "POST" && path === "/users") {
      return withBody((body) => {
        const user = {
          id: `u-${state.users.length + 1}`,
          email: String(body.email ?? ""),
          full_name: String(body.full_name ?? ""),
          title: String(body.title ?? ""),
          role_id: String(body.role_id ?? ""),
          status: String(body.status ?? "active"),
        };
        state.users.push(user);
        return send(201, user);
      });
    }

    // /users/{id}/password
    const pwMatch = path.match(/^\/users\/([^/]+)\/password$/);
    if (method === "PATCH" && pwMatch) return withBody(() => send(204));

    // /users/{id}/project-access
    const paMatch = path.match(/^\/users\/([^/]+)\/project-access$/);
    if (paMatch && method === "GET") {
      const userId = paMatch[1];
      return send(200, state.projectAccess[userId] ?? { all_projects: false, project_ids: [] });
    }
    if (paMatch && method === "PUT") {
      const userId = paMatch[1];
      return withBody((body) => {
        const access = {
          all_projects: Boolean(body.all_projects),
          project_ids: Array.isArray(body.project_ids) ? (body.project_ids as string[]) : [],
        };
        state.projectAccess[userId] = access;
        return send(200, access);
      });
    }

    // /users/{id} PATCH/DELETE
    const userIdMatch = path.match(/^\/users\/([^/]+)$/);
    if (userIdMatch && method === "PATCH") {
      const userId = userIdMatch[1];
      return withBody((body) => {
        const user = state.users.find((u) => u.id === userId);
        if (!user) return send(404, { detail: "kullanici yok" });
        if (body.full_name !== undefined) user.full_name = String(body.full_name);
        if (body.title !== undefined) user.title = String(body.title);
        if (body.role_id !== undefined) user.role_id = String(body.role_id);
        if (body.status !== undefined) user.status = String(body.status);
        return send(200, user);
      });
    }
    if (userIdMatch && method === "DELETE") {
      const userId = userIdMatch[1];
      state.users = state.users.filter((u) => u.id !== userId);
      return send(204);
    }

    // /company
    if (method === "GET" && path === "/company") return send(200, state.company);
    if (method === "PUT" && path === "/company") {
      return withBody((body) => {
        state.company = { ...state.company, ...body } as MockState["company"];
        return send(200, state.company);
      });
    }

    // /settings/preferences
    if (method === "GET" && path === "/settings/preferences") return send(200, state.preferences);
    if (method === "PUT" && path === "/settings/preferences") {
      return withBody((body) => {
        state.preferences = { ...state.preferences, ...body } as MockState["preferences"];
        return send(200, state.preferences);
      });
    }

    // /settings/notifications
    if (method === "GET" && path === "/settings/notifications") return send(200, state.notifications);
    if (method === "PUT" && path === "/settings/notifications") {
      return withBody((body) => {
        const items = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
        for (const item of items) {
          const target = state.notifications.find((n) => n.event_key === item.event_key);
          if (!target) continue;
          if (item.email !== undefined) target.email = Boolean(item.email);
          if (item.in_app !== undefined) target.in_app = Boolean(item.in_app);
          if (item.sms !== undefined) target.sms = Boolean(item.sms);
        }
        return send(200, state.notifications);
      });
    }

    return send(404, { detail: "not found" });
  });

  server.listen(port);
  return {
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
