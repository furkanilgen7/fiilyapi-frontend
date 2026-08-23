import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { components } from "@/lib/api/schema";
import { pendingModuleLabel } from "@/lib/pending-modules";

import { PendingApprovalsCard } from "./PendingApprovalsCard";

type Placeholder = components["schemas"]["PendingApprovalsPlaceholder"];

// Backend `available: true` + gercek `count` doner ama `items` alanini BILEREK
// atlar (app/modules/dashboard/service.py:106-108). Uc durum ayri ayri olculur.
const WITH_ITEMS: Placeholder = {
  available: true,
  count: 2,
  items: ["Hakediş #47 – Güneşkent", "Satın Alma – Beton"],
  pending_module: "approvals",
};

const COUNT_ONLY: Placeholder = {
  available: true,
  count: 3,
  pending_module: "approvals",
};

const EMPTY: Placeholder = {
  available: false,
  count: 0,
  items: [],
  pending_module: "approvals",
};

describe("PendingApprovalsCard · count>0 ve items dolu", () => {
  it("her item satirini basar", () => {
    render(<PendingApprovalsCard data={WITH_ITEMS} />);
    expect(screen.getByText("Hakediş #47 – Güneşkent")).toBeInTheDocument();
    expect(screen.getByText("Satın Alma – Beton")).toBeInTheDocument();
  });

  it("rozette count'u basar", () => {
    render(<PendingApprovalsCard data={WITH_ITEMS} />);
    expect(screen.getByTestId("dash-approvals-badge")).toHaveTextContent("2");
  });

  it("/onay-kutusu bagi BASILMAZ", () => {
    render(<PendingApprovalsCard data={WITH_ITEMS} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("PendingApprovalsCard · count>0 ama items BOS", () => {
  it("rozette count'u basar", () => {
    render(<PendingApprovalsCard data={COUNT_ONLY} />);
    expect(screen.getByTestId("dash-approvals-badge")).toHaveTextContent("3");
  });

  it("/onay-kutusu bagini ve '{count} bekleyen' metnini basar", () => {
    render(<PendingApprovalsCard data={COUNT_ONLY} />);
    const link = screen.getByRole("link", { name: /Onay Kutusu/ });
    expect(link).toHaveAttribute("href", "/onay-kutusu");
    expect(screen.getByText("3 bekleyen")).toBeInTheDocument();
  });

  it("'Onay bekleyen kayıt yok' YALANINI basmaz", () => {
    render(<PendingApprovalsCard data={COUNT_ONLY} />);
    expect(screen.queryByText("Onay bekleyen kayıt yok")).toBeNull();
  });

  it("bayat pending_module gerekcesini basmaz", () => {
    render(<PendingApprovalsCard data={COUNT_ONLY} />);
    expect(screen.queryByText(pendingModuleLabel("approvals"))).toBeNull();
  });

  // 🔴 ÖLÇÜLDÜ (M3 mutasyonu): yukaridaki etiket iddiasi TEK BASINA yetmez.
  // `CardEmptyState` ipucunu KOSULSUZ basacak sekilde bozuldugunda kart artik
  // `pendingModule` GECMEDIGI icin yedek metin ("İlgili modülle birlikte
  // gelir") basiliyor ve etiket iddiasi sessizce yesil kaliyordu. Yapisal
  // iddia: bu durumda HICBIR gerekce paragrafi olmamali.
  it("hicbir gerekce paragrafi basmaz", () => {
    const { container } = render(<PendingApprovalsCard data={COUNT_ONLY} />);
    expect(container.querySelector(".dash-empty__hint")).toBeNull();
  });
});

describe("PendingApprovalsCard · count==0", () => {
  it("'Onay bekleyen kayıt yok' basar", () => {
    render(<PendingApprovalsCard data={EMPTY} />);
    expect(screen.getByText("Onay bekleyen kayıt yok")).toBeInTheDocument();
  });

  it("rozet BASILMAZ", () => {
    render(<PendingApprovalsCard data={EMPTY} />);
    expect(screen.queryByTestId("dash-approvals-badge")).toBeNull();
  });

  it("bayat pending_module gerekcesini basmaz", () => {
    render(<PendingApprovalsCard data={EMPTY} />);
    expect(screen.queryByText(pendingModuleLabel("approvals"))).toBeNull();
  });

  // 🔴 ÖLÇÜLDÜ (M3 mutasyonu) — bkz. yukaridaki ayni gerekce.
  it("hicbir gerekce paragrafi basmaz", () => {
    const { container } = render(<PendingApprovalsCard data={EMPTY} />);
    expect(container.querySelector(".dash-empty__hint")).toBeNull();
  });

  it("/onay-kutusu bagi BASILMAZ", () => {
    render(<PendingApprovalsCard data={EMPTY} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
