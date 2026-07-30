import type { components } from "@/lib/api/schema";

// Istemci tarafi izin okuma altyapisi (spec §2.5). Bu dosya EKRAN BAGIMSIZDIR:
// modul adi sabiti, rol->seviye haritasi ya da ekrana ozgu kural TASIMAZ
// (spec §2.5.1: matris Ayarlar'dan calisma aninda degisebiliyor, sabit harita
// ilk duzenlemede yalan soyler). Guvenlik siniri her zaman backend'dedir;
// buradaki kapi yalniz gorsel gurultuyu azaltir.
export type AccessLevel = components["schemas"]["AccessLevel"];

/** Backend `AccessLevel` sıralaması, artan yetki yönünde. */
export const ACCESS_LEVELS: readonly AccessLevel[] = [
  "none",
  "view",
  "draft",
  "request",
  "approve",
  "full",
  "admin",
];

/** Yazma yetkisi sayılan seviyeler (backend sıralamasıyla birebir). */
export const WRITE_LEVELS: readonly AccessLevel[] = [
  "draft",
  "request",
  "approve",
  "full",
  "admin",
];

/**
 * Silme yetkisi sayılan seviyeler — YAZMANIN ALT KÜMESİ, `WRITE_LEVELS`'ten
 * ayrıdır (kullanıcı kararı: silme yalnız sistem yöneticisinde).
 *
 * Backend'de silme uçları `admin` kapısındadır; `full` seviyeli kullanıcı yazar
 * ama silemez. Bu liste `WRITE_LEVELS`'e eşitlenirse `full` kullanıcı çalışmayan
 * bir silme butonu görür ve tıklayınca 403 alır.
 */
export const DELETE_LEVELS: readonly AccessLevel[] = ["admin"];

/** Dış veriden gelen seviye dizesini doğrular; tanınmayan değer `false`. */
export function isAccessLevel(value: unknown): value is AccessLevel {
  return typeof value === "string" && (ACCESS_LEVELS as readonly string[]).includes(value);
}

/**
 * Seviye bilinmiyorsa `true` döner — bilinmezlik yasak sayılmaz (spec §2.5.3).
 *
 * ⚠️ Bu kural TERS ÇEVRİLEMEZ. `MeResponse` artık `permissions` taşıyor
 * (backend takip işi BE-A kapandı) → seviye BİLİNDİĞİNDE gerçek gizleme
 * devrededir. Bilinmezlik dalı yine de kalır ve kalmalıdır: yükü henüz
 * gelmemiş oturum, alanı taşımayan eski token ve haritada bulunmayan modül
 * anahtarı bu dala düşer; orada gizleme yapmak tam yetkili kullanıcıya
 * ekranı salt-okunur gösterir — sessiz yetenek kaybı olur.
 */
export function canWrite(level: AccessLevel | undefined): boolean {
  if (level === undefined) return true;
  return WRITE_LEVELS.includes(level);
}

/**
 * Silme kapısı — `canWrite` ile AYNI bilinmezlik kuralı (spec §2.5.3):
 * seviye bilinmiyorsa `true`. Alanı taşımayan eski oturumda gizleme devreye
 * girerse sistem yöneticisi silme yüzeyini sessizce kaybeder.
 *
 * `canWrite`'ten AYRI çağrılır; silme yüzeyleri `canWrite` ile kapılanamaz.
 */
export function canDelete(level: AccessLevel | undefined): boolean {
  if (level === undefined) return true;
  return DELETE_LEVELS.includes(level);
}
