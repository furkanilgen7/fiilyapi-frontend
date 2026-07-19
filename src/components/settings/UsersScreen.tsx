"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { useUsers, PAGE_SIZE } from "@/lib/api/hooks/useUsers";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { StatusBadge } from "./StatusBadge";
import type { RoleResponse } from "@/lib/api/models";
import "./settings.css";

function roleName(roles: RoleResponse[] | undefined, roleId: string): string {
  return roles?.find((r) => r.id === roleId)?.name ?? "—";
}

function pageFromParams(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function UsersScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = pageFromParams(searchParams.get("sayfa"));
  const offset = (page - 1) * PAGE_SIZE;

  const usersQuery = useUsers({ limit: PAGE_SIZE, offset });
  const rolesQuery = useRoles();

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sayfa", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (usersQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }

  if (usersQuery.isError || !usersQuery.data) {
    return <p className="settings-note settings-note--error">Kullanıcılar yüklenemedi.</p>;
  }

  const { items, total } = usersQuery.data;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="settings-panel">
      <div className="settings-panel__toolbar">
        <span className="settings-panel__count">{total} kullanıcı</span>
      </div>

      <table className="settings-table">
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>E-posta</th>
            <th>Unvan</th>
            <th>Rol</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.title}</td>
              <td>{roleName(rolesQuery.data, user.role_id)}</td>
              <td>
                <StatusBadge status={user.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="settings-pager">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Önceki
        </Button>
        <span className="settings-pager__label">
          Sayfa {page} / {pageCount}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
          Sonraki
        </Button>
      </div>
    </div>
  );
}
