import { describe, expect, it } from "vitest";

import { buildRouteTree, resolveHrefIn } from "@/components/shell/route-tree.testkit";
import { PROJECT_TIMELINE_HREF } from "./ProjectsView";

/**
 * 🔴 NAV YÜZEYİ BEKÇİYE KAYDEDİLMEZSE ÇÜRÜR (F-PRJTAB kanonu, WORKFLOW §4):
 * *"araç varlığı koruma değildir; koruma, yüzeyin araca KAYDEDİLMESİDİR."*
 *
 * `/projeler` liste ekranı kullanıcıyı bir rotaya gönderen bir yüzeydir ama
 * bugüne kadar hiçbir rota bekçisine kayıtlı DEĞİLDİ (`nav-config.test.ts`,
 * `tab-strip-routes.test.tsx`,
 * `accounting-nav-config.test.ts`, `financial-statements-nav-config.test.ts` —
 * beşi de bu ekranı kapsamıyor). F-TKV oraya bir bağlantı koyduğu için kaydı
 * da burada açar.
 *
 * `allowDynamicFallback: false` KRİTİKTİR: `/projeler/takvim` statik `takvim`
 * klasörü olmasaydı kardeşi `[projectId]`ye düşerdi ve bekçi bunu "çözüldü"
 * sanardı — tam da `allowDynamicFallback`ın körleştirdiği sınıf.
 */
const ROUTE_TREE = buildRouteTree();

describe("Projeler liste ekranının rotaları", () => {
  it("Proje Takvimi bağlantısı GERÇEK bir statik rotaya çözülür", () => {
    expect(resolveHrefIn(ROUTE_TREE, PROJECT_TIMELINE_HREF, false)).toEqual({ kind: "static" });
  });

  it("Yeni Proje bağlantısı GERÇEK bir statik rotaya çözülür", () => {
    expect(resolveHrefIn(ROUTE_TREE, "/projeler/yeni", false)).toEqual({ kind: "static" });
  });

  it("NEGATİF DENETİM: olmayan bir alt rota statik ÇÖZÜLMEZ", () => {
    // Bekçinin gerçekten bir şey ölçtüğünün kanıtı — `[projectId]` dinamik
    // klasörü uydurma segmenti yutmamalı (allowDynamicFallback: false).
    expect(resolveHrefIn(ROUTE_TREE, "/projeler/boyle-bir-ekran-yok", false)).not.toEqual({
      kind: "static",
    });
  });
});
