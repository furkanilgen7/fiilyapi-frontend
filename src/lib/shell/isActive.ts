// Aktif eslestirme: "/" tam eslesme; digerleri prefix (alt rotalar da aktif).
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
