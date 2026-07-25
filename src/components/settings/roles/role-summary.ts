import type { PermissionCell, ModuleResponse } from "@/lib/api/models";

// Rol kartı alt-satırı için modül-kapsam özeti (ref §A.6).
export function roleModuleSummary(cells: PermissionCell[], modules: ModuleResponse[]): string {
  const accessible = cells.filter((c) => c.access_level !== "none");
  if (accessible.length === 0) return "Erişim yok";
  if (
    accessible.length === modules.length &&
    accessible.every((c) => c.access_level === "full" || c.access_level === "admin")
  ) {
    return "Tüm modüller";
  }
  const nameByKey = new Map(modules.map((m) => [m.key, m.name]));
  return accessible
    .map((c) => nameByKey.get(c.module_key))
    .filter((n): n is string => Boolean(n))
    .slice(0, 4)
    .join(" · ");
}
