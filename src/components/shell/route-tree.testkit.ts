// Kırık link koruması için ORTAK yardımcı (yalnız testlerden çağrılır; uygulama
// paketine girmez — `node:fs` içerdiği için hiçbir bileşenden import EDİLMEZ).
//
// Nav yapılandırmalarının ürettiği href'leri `src/app/(app)/` dosya sistemindeki
// GERÇEK rotalarla (elle yazılmış bir liste DEĞİL) karşılaştırır.
//
// Vaka (F-TH dersi): "İşveren Hakediş" → "/hakedisler/isveren" hardcode
// edilmişti. Böyle bir statik rota yok; `/hakedisler/[paymentId]/page.tsx`
// dinamik rotası "isveren"i bir hakediş ID'si sanıp yutuyordu → kullanıcı
// bulunamadı ekranı görüyordu.
//
// Kural: statik (sabit metin) href'ler yalnızca gerçek bir literal rotaya ya da
// (dinamik kardeş klasör YOKSA) [...slug] catch-all'a düşebilir. Bir href'in TEK
// eşleşme yolu dinamik bir segment klasörüyse (ör. [paymentId]) bu GEÇERSİZ
// sayılır — dinamik segmentler statik href parçalarını yutamaz. Gerçek
// ID'lerle üretilmiş href'lerde (ör. "/projeler/1/santiyeler/9") dinamik
// eşleşme beklenen davranıştır: `allowDynamicFallback` onun içindir.
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface RouteNode {
  literalChildren: Map<string, RouteNode>;
  dynamicChild?: { name: string; node: RouteNode };
  hasPage: boolean;
}

export type ResolveResult =
  | { kind: "static" }
  | { kind: "catch-all" }
  | { kind: "dynamic-fallback"; dynamicSegmentName: string; matchedPrefix: string }
  | { kind: "not-found" };

/** `src/app/(app)` kökü — bu dosyanın konumuna göre çözülür. */
export const APP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../app/(app)");

export function buildRouteTree(dir: string = APP_DIR): RouteNode {
  const node: RouteNode = { literalChildren: new Map(), hasPage: false };
  if (!existsSync(dir)) return node;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) {
      if (entry === "page.tsx") node.hasPage = true;
      continue;
    }
    // [...slug] catch-all ayrı ele alınır; ağaca dahil edilmez.
    if (entry === "[...slug]") continue;
    const child = buildRouteTree(full);
    if (entry.startsWith("[") && entry.endsWith("]")) {
      node.dynamicChild = { name: entry, node: child };
    } else {
      node.literalChildren.set(entry, child);
    }
  }
  return node;
}

export function resolveHrefIn(
  tree: RouteNode,
  href: string,
  allowDynamicFallback: boolean,
): ResolveResult {
  const segments = href.split("/").filter(Boolean);
  let node = tree;
  let matchedPrefix = "";
  for (const segment of segments) {
    const literal = node.literalChildren.get(segment);
    if (literal) {
      node = literal;
      matchedPrefix += `/${segment}`;
      continue;
    }
    if (node.dynamicChild) {
      if (!allowDynamicFallback) {
        return { kind: "dynamic-fallback", dynamicSegmentName: node.dynamicChild.name, matchedPrefix };
      }
      node = node.dynamicChild.node;
      matchedPrefix += `/${segment}`;
      continue;
    }
    // Ne literal ne dinamik kardeş var: [...slug] catch-all'a düşer.
    return { kind: "catch-all" };
  }
  return node.hasPage ? { kind: "static" } : { kind: "not-found" };
}

/**
 * ALT ROTASI OLAN ama KENDİSİ HENÜZ AÇILMAMIŞ segmentler (iki nav testi de
 * bunu kullanır).
 *
 * `/personel` (F-PT T4): `app/(app)/personel/` klasörü YALNIZ `yeni/page.tsx`
 * taşır — personel LİSTE ekranı İK dilimine kaldı. Next.js'te `/personel` için
 * eşleşen bir `page.tsx` olmadığından istek kök `[...slug]` catch-all'ına düşer
 * ve ComingSoon basılır (nav girdisi bilinçli olarak orada durur). Ağaç
 * yürüyüşü bunu "not-found" görür; gerçek davranış catch-all'dır.
 *
 * Bu küme DAR tutulur: liste ekranı yazıldığında buradan SİLİNİR.
 */
export const COMING_SOON_PARENT_HREFS = new Set(["/personel"]);
