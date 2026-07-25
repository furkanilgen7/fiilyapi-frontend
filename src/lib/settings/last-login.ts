// Son giriş görünümü (ref §A.5). Backend last_login_at'i UserResponse'a eklerse kullanılır.
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatLastLogin(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (dayDiff <= 0) return `Bugün ${hm}`;
  if (dayDiff === 1) return `Dün ${hm}`;
  return `${dayDiff} gün önce`;
}
