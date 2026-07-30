"use client";

import { useSession } from "@/components/shell/SessionProvider";
import { canWrite, isAccessLevel, type AccessLevel } from "./permissions";

export interface ModulePermission {
  /** Seviye bilinmiyorsa undefined (oturum yükleniyor ya da alan yok). */
  level: AccessLevel | undefined;
  /** level === undefined → true (bilinmezlik kuralı, spec §2.5.3). */
  canView: boolean;
  /** level === undefined → true (bilinmezlik kuralı, spec §2.5.3). */
  canWrite: boolean;
}

/**
 * Oturum yükünden tek modülün izin seviyesini okur (spec §2.5.2).
 *
 * `MeResponse` artik `permissions` alanini TASIYOR; yuk yine de bicimsel
 * olarak dogrulanir (tip degil, calisma ani verisi): alani tasimayan eski
 * oturum ya da taninmayan seviye dizesi `undefined`'a duser, bilinmezlik
 * kurali orada devreye girer.
 */
function readLevel(me: unknown, moduleKey: string): AccessLevel | undefined {
  if (typeof me !== "object" || me === null) return undefined;
  const { permissions } = me as { permissions?: unknown };
  if (typeof permissions !== "object" || permissions === null) return undefined;
  const level = (permissions as Record<string, unknown>)[moduleKey];
  return isAccessLevel(level) ? level : undefined;
}

/**
 * Ağ isteği YAPMAZ: kaynak `SessionProvider`'ın zaten çektiği `/auth/me`
 * yanıtıdır. Modül anahtarı parametredir — sonraki ekranlar aynı hook'u
 * `useModulePermission("contracts")` gibi çağırır, ekran başına izin
 * yardımcısı yazmak yasaktır (spec §2.5.4).
 */
export function useModulePermission(moduleKey: string): ModulePermission {
  const { me } = useSession();
  const level = readLevel(me, moduleKey);
  return {
    level,
    // Bilinmezlik kuralı: seviye yoksa görünür kalır; yalnız açıkça "none"
    // olduğunda okuma da kapanır.
    canView: level !== "none",
    canWrite: canWrite(level),
  };
}
