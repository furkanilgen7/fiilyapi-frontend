import { randomBytes } from "node:crypto";

import type { NextConfig } from "next";

/**
 * PLN-F2.0 — build kimliğinin TEK kaynağı (sürüm bandı, bkz.
 * `src/lib/api/app-build.ts`).
 *
 * Öncelik: elle verilen `APP_BUILD_ID` → Railway'in derleme anında verdiği
 * `RAILWAY_GIT_COMMIT_SHA` → CI'ın `GITHUB_SHA`sı → rastgele. Aynı commit'in
 * yeniden derlenmesi aynı kimliği üretir (kod aynı, açık sekmeler eski
 * sayılmaz); rastgele düşüş her derlemeyi yeni sürüm sayar (güvenli taraf).
 *
 * 🔴 Değer `process.env`e BİR KEZ yazılır: `next build` derleme işçilerini
 * (istemci/sunucu webpack derleyicileri) ayrı süreçlerde açar ve her biri bu
 * dosyayı YENİDEN değerlendirir. Rastgele düşüş her değerlendirmede yeni değer
 * üretseydi istemci paketine ve sunucuya FARKLI kimlik gömülür, her yazma
 * "eski sürüm" diye reddedilirdi. Ana süreç değeri ortama yazar, işçiler ortamı
 * miras alır ve `??=` onu korur.
 */
process.env.NEXT_PUBLIC_BUILD_ID ??=
  process.env.APP_BUILD_ID ||
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  randomBytes(8).toString("hex");

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next'in kendi build kimliği (`.next/BUILD_ID`) de aynı değer — tek kaynak.
  generateBuildId: () => BUILD_ID,
  // Derleme anında istemci VE sunucu paketine metin olarak gömülür.
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
};

export default nextConfig;
