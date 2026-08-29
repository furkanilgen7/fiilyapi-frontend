"use client";

/**
 * F-KIRINTI · üst çubuk yol göstergesi + geri tuşu.
 *
 * Kanon `projedesign/Şantiye - Günlük Kayıt.dc.html` 33-41: kırıntı 52px'lik
 * üst çubuğun İÇİNDE, logo bloğu ile eylemler arasında durur ve son parçası
 * BAĞLANTI DEĞİLDİR (K3). Geri tuşu mockup'ta YOKTUR — kullanıcı onu açıkça
 * istedi, yani mockup'ın SESSİZ kaldığı bir yerdir; ürünün kendi `←` deyimi
 * (on ikiden fazla ekranda) üst çubuğa TAŞINDI, yeni tasarım icat edilmedi.
 *
 * Bu dosya yalnız DOM kurar; ne basılacağına `trail.ts` (saf), adların
 * nereden geleceğine `useCrumbNames.ts` (yalnız önbellek) karar verir.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { backTarget, buildTrail, routeKeysOf, type Crumb } from "./trail";
import { useCrumbNames } from "./useCrumbNames";

function CrumbText({ crumb }: { crumb: Crumb }) {
  if (!crumb.pending) return <>{crumb.label}</>;
  // K6 — ad gelene kadar YALAN SÖYLEME: ham UUID/slug yerine yer tutucu.
  // Yedek etiket ("Şantiye") ekran okuyucuya `sr-only` ile okunur; shimmer
  // yalnız görsel bir yer tutucudur.
  return (
    <span className="topbar-crumbs__pending" data-testid="crumb-pending">
      <span className="sr-only">{crumb.label}</span>
    </span>
  );
}

export function TopbarBreadcrumb() {
  // `usePathname` App Router'da her zaman string döner; savunma yalnız
  // bileşenin router dışında (test/hikaye) render edilmesi içindir.
  const pathname = usePathname() ?? "/";
  const keys = routeKeysOf(pathname);
  const names = useCrumbNames(keys);
  const trail = buildTrail(pathname, names);
  const back = backTarget(trail);

  return (
    <nav className="topbar-crumbs" aria-label="Yol göstergesi">
      {back?.href !== undefined && (
        <Link
          href={back.href}
          className="topbar-crumbs__back"
          data-testid="topbar-back"
          // Hedefin adı hemen sağdaki kırıntıda yazılı; tuş onu tekrarlamaz
          // ama erişilebilir ad ve ipucu ONU söyler.
          aria-label={`${back.label} sayfasına dön`}
          title={`${back.label} sayfasına dön`}
        >
          <span aria-hidden="true">←</span>
        </Link>
      )}
      <ol className="topbar-crumbs__list" data-testid="topbar-crumbs">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={crumb.href ?? `crumb-${index}`} className="topbar-crumbs__item">
              {index > 0 && (
                <span className="topbar-crumbs__sep" aria-hidden="true">
                  /
                </span>
              )}
              {isLast || crumb.href === undefined ? (
                // K3 — SON parça bağlantı değildir (mockup 40).
                //
                // 🔴 `aria-current="page"` BİLEREK BASILMAZ (K7 canonu). W3C
                // APG'nin kırıntı örneği onu son parçaya koyar, ama BU depoda
                // yazılı ve gerekçeli bir karar var: sayfada TAM BİR
                // `aria-current` bulunur ve o da kabuk menüsündedir —
                // *"ikincisi ekran okuyucuya İKİ SAYFA derdi"*
                // (`financial-statements.spec.ts` K7 bekçileri). En yakın
                // emsal birebir aynı şekle sahip: Mali Tablolar'ın segment
                // şeridi de bir yol göstergesidir ve "bulunulan" öğesine
                // `aria-current` SÜRMEZ. İki trail bileşeninin farklı
                // davranması tek başına bir kusur olurdu.
                //
                // Kararı değiştirmek K7'yi ve beş e2e bekçisini birden
                // oynatır — bu dilimin kapsamı DEĞİL, yönetime rapor edildi.
                <span className="topbar-crumbs__current">
                  <CrumbText crumb={crumb} />
                </span>
              ) : (
                <Link href={crumb.href} className="topbar-crumbs__link">
                  <CrumbText crumb={crumb} />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
