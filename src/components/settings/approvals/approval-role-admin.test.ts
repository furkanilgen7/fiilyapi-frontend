import { describe, expect, it } from "vitest";

import type { ApprovalRoleAssignmentRead } from "@/lib/api/hooks/useApprovals";
import type { RoleResponse, UserResponse } from "@/lib/api/models";

import {
  APPROVAL_ROLE_ORDER,
  approvalRoleCountLabel,
  approvalThresholdAboveLabel,
  approvalThresholdBelowLabel,
  mergeApprovalRoleRows,
  toggleApprovalRole,
} from "./approval-role-admin";

function user(partial: Partial<UserResponse> & { id: string; full_name: string }): UserResponse {
  return {
    email: `${partial.id}@fiil.com`,
    title: "",
    role_id: "role-pm",
    status: "active",
    ...partial,
  } as UserResponse;
}

const ROLES: RoleResponse[] = [
  { id: "role-pm", key: "project_manager", name: "Proje Müdürü" } as RoleResponse,
];

function assignment(
  userId: string,
  roles: ApprovalRoleAssignmentRead["approval_roles"],
  fullName = "Atama",
): ApprovalRoleAssignmentRead {
  return { user_id: userId, full_name: fullName, email: `${userId}@fiil.com`, approval_roles: roles };
}

describe("APPROVAL_ROLE_ORDER", () => {
  it("beş rolü mockup sırasında taşır (`:190-196`)", () => {
    expect(APPROVAL_ROLE_ORDER).toEqual([
      "site_chief",
      "project_manager",
      "accounting",
      "patron",
      "procurement",
    ]);
  });
});

describe("toggleApprovalRole", () => {
  it("olmayan rolü ekler, sırayı KORUR (kanonik sıra, tıklama sırası DEĞİL)", () => {
    expect(toggleApprovalRole(["patron"], "site_chief")).toEqual(["site_chief", "patron"]);
  });
  it("var olan rolü çıkarır", () => {
    expect(toggleApprovalRole(["site_chief", "patron"], "patron")).toEqual(["site_chief"]);
  });
  it("çoklu rolü korur — bir kişi BİRDEN ÇOK rol taşıyabilir", () => {
    expect(toggleApprovalRole(["site_chief"], "project_manager")).toEqual([
      "site_chief",
      "project_manager",
    ]);
  });
  it("girdiyi MUTASYONA UĞRATMAZ", () => {
    const current = ["patron"] as const;
    toggleApprovalRole(current, "accounting");
    expect(current).toEqual(["patron"]);
  });
});

describe("mergeApprovalRoleRows", () => {
  it("🔴 ROLÜ OLMAYAN kullanıcı da satır alır — yoksa ona rol VERİLEMEZDİ", () => {
    const rows = mergeApprovalRoleRows([user({ id: "u-1", full_name: "Ali" })], ROLES, []);
    expect(rows).toHaveLength(1);
    expect(rows[0].approvalRoles).toEqual([]);
    expect(rows[0].systemRole?.name).toBe("Proje Müdürü");
  });

  it("atama, katalog satırının üzerine biner", () => {
    const rows = mergeApprovalRoleRows(
      [user({ id: "u-1", full_name: "Ali" })],
      ROLES,
      [assignment("u-1", ["accounting", "patron"])],
    );
    expect(rows[0].approvalRoles).toEqual(["accounting", "patron"]);
  });

  it("katalog sayfasında OLMAYAN bir atama satırı DÜŞMEZ", () => {
    const rows = mergeApprovalRoleRows([], ROLES, [assignment("u-9", ["patron"], "Zeynep")]);
    expect(rows.map((r) => r.userId)).toEqual(["u-9"]);
    expect(rows[0].systemRole).toBeUndefined();
  });

  it("TR harmanıyla ada göre sıralar (kare determinizmi satır sırasına bağlıdır)", () => {
    const rows = mergeApprovalRoleRows(
      [
        user({ id: "u-2", full_name: "Zeynep" }),
        user({ id: "u-3", full_name: "Çetin" }),
        user({ id: "u-1", full_name: "Ali" }),
      ],
      ROLES,
      [],
    );
    expect(rows.map((r) => r.fullName)).toEqual(["Ali", "Çetin", "Zeynep"]);
  });

  it("ad eşitliğini `userId` bozar — sıra KARARLIDIR", () => {
    const rows = mergeApprovalRoleRows(
      [user({ id: "u-9", full_name: "Ali" }), user({ id: "u-2", full_name: "Ali" })],
      ROLES,
      [],
    );
    expect(rows.map((r) => r.userId)).toEqual(["u-2", "u-9"]);
  });
});

describe("approvalRoleCountLabel", () => {
  /**
   * 🔴 MOCKUP'IN "8 kullanıcı"SI ÇİZİM SAYISIDIR ve kendi tablosuyla çelişir
   * (5 satır). Sayı VERİDEN türetilir.
   */
  it("basılan SATIR sayısını yazar, sabit değil", () => {
    expect(approvalRoleCountLabel(5)).toBe("5 kullanıcı");
    expect(approvalRoleCountLabel(0)).toBe("0 kullanıcı");
    expect(approvalRoleCountLabel(8)).toBe("8 kullanıcı");
  });
});

describe("eşik şeridi etiketleri", () => {
  it("`≥` glifi YERİNE sözcük kullanır (kapsanmayan glif yasağı)", () => {
    expect(approvalThresholdBelowLabel("₺500.000")).toBe("₺500.000 altı");
    expect(approvalThresholdAboveLabel("₺500.000")).toBe("₺500.000 ve üstü");
    expect(approvalThresholdAboveLabel("₺500.000")).not.toContain("≥");
  });
});
