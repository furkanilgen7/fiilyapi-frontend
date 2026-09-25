/**
 * DET-1.2 · S4 — Bölüm Detay testleri için DURUMLU `next/navigation` ikizi.
 *
 * Sekme artık YEREL state değil, `?sekme=` URL parametresidir. Eski test
 * mock'ları yalnız `useParams` taşıyordu; sekmeye tıklamak `router.replace`
 * çağırır ve düz bir `vi.fn()` URL'i DEĞİŞTİRMEDİĞİ için panel hiç değişmezdi
 * (testler "Malzeme" panelini beklerken "İş Kalemleri"nde kalırdı).
 *
 * Bu ikiz `replace`i gerçekten uygular: sorgu dizesini saklar ve
 * `useSyncExternalStore` ile abone bileşeni yeniden render eder. Yani testler
 * gerçek tarayıcıdaki döngünün aynısını görür: tık → `replace` → URL → sekme.
 *
 * Kullanım (fabrika hoist edildiği için ASYNC içe alma şarttır):
 *
 *   vi.mock("next/navigation", async () =>
 *     (await import("./section-nav.testkit")).sectionNavModule(() => ({ projectId, siteId, sectionId })),
 *   );
 *   beforeEach(() => sectionNav.reset());
 *
 * `vitest` İÇE ALINMAZ (test-dışı dosyada vitest yasak — `src/lib/api`
 * bekçisi). `replace` çağrıları `sectionNav.replaceCalls`ta birikir.
 */
import { useSyncExternalStore } from "react";

/** Testlerin kullandığı bölüm detayı adresi — `replace` hedefinin yolu. */
export const SECTION_NAV_PATHNAME = "/projeler/p/santiyeler/s/bolumler/b";

function createSectionNav() {
  let search = "";
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  // Çağrı kaydı: testler `replaceCalls.at(-1)` ile son çağrıyı (href + `{ scroll }`) okur.
  const replaceCalls: [string, { scroll?: boolean } | undefined][] = [];
  function replace(href: string, options?: { scroll?: boolean }) {
    replaceCalls.push([href, options]);
    const queryStart = href.indexOf("?");
    search = queryStart === -1 ? "" : href.slice(queryStart + 1);
    notify();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    replace,
    replaceCalls,
    /** Her testten önce: sorgu dizesini (verilirse başlangıç değerine) ve çağrı kaydını sıfırlar. */
    reset(initialSearch = "") {
      search = initialSearch;
      replaceCalls.length = 0;
      notify();
    },
    useSearchParams() {
      const current = useSyncExternalStore(subscribe, () => search, () => search);
      return new URLSearchParams(current);
    },
  };
}

export const sectionNav = createSectionNav();

/**
 * `vi.mock("next/navigation", …)` fabrikasının döndüreceği modül.
 *
 * Parametreler GETIRICIYLE verilir: fabrika, test dosyasının sabitleri
 * ilklenmeden ÖNCE (içe almalar hoist edilir) çalışır — değeri doğrudan
 * geçirmek TDZ hatası verirdi.
 */
export function sectionNavModule(getParams: () => Record<string, string>) {
  return {
    useParams: () => getParams(),
    usePathname: () => SECTION_NAV_PATHNAME,
    useRouter: () => ({ replace: sectionNav.replace, push: () => undefined, back: () => undefined }),
    useSearchParams: () => sectionNav.useSearchParams(),
  };
}
