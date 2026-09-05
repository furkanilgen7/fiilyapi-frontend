"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/select/Select";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";

import { DiaryEntryScreen } from "./SiteDiaryEntryView";
import "./site-diary.css";

/**
 * Genel "Günlük Kayıt" — rota `/gunluk-kayit`, kabuk sol menüsündeki `Saha`
 * grubunun öğesi (kullanıcı kararı 2026-09-05).
 *
 * ═══ MOCKUP TEMELİ ═══
 * `Ekran 7 - Şantiye Günlüğü Girişi.dc.html` (E7). E7, günlük kayıt ekranını
 * ANA KABUKTA çizer: sol menü tam kabuk menüsüdür (E7 30-60) ve şantiye
 * DRILL sekme şeridi (`SiteDetailTabs`) YOKTUR — şantiye kapsamlı ikizi
 * `Şantiye - Günlük Kayıt.dc.html` (GK) o şeridi çizer. Yani "ekranın ana
 * kabukta yaşaması" uydurma DEĞİL, ölçülmüş mockup gerçeğidir.
 *
 * 🔴 E7'DE ŞANTİYE SEÇİCİ YOKTUR — ölçüldü: dosyadaki tek `<select>` hava
 * durumudur (E7 85-90). E7 şantiyeyi bir GERİ BAĞLANTIYLA taşır
 * ("← A-Blok Şantiyesi · Günlük Kayıt"), yani kullanıcının bir şantiyeden
 * geldiğini varsayar. Sol menüden gelindiğinde böyle bir bağlam YOKTUR.
 * Seçici bu boşluğu kapatır ve `Ekran 5 - Puantaj.dc.html`ten (E5 96) BİREBİR
 * alınmıştır: E5, `/puantaj`ın genel hâlidir ve şantiyeyi aynı sorunla aynı
 * çözümle taşır. `useSiteOptions` zaten "genel puantajın şantiye seçicisi"
 * olarak yazılmıştı — burada ikinci çağıranını buldu.
 *
 * DURUM URL'DE (`?site=`) — `GeneralTimesheetView` ile AYNI anahtar; bağlantı
 * paylaşılabilir olsun. Yol elle KURULMAZ (URL-1): `usePathname()` üzerine
 * yalnız sorgu yazılır.
 */
export function GeneralSiteDiaryView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const siteOptions = useSiteOptions();
  // Seçili şantiye URL'den; yoksa ilk seçenek (E5 deseni — mockup seçiciyi HER
  // ZAMAN dolu çizer, boş bir seçici uydurulmaz).
  const siteParam = searchParams.get("site");
  const selected =
    siteOptions.options.find((option) => option.siteId === siteParam) ??
    siteOptions.options[0];

  function pushSite(siteId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", siteId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <DiaryEntryScreen
      // 🔴 Seçenekler KANONİK UUID taşır (`useSiteOptions`), slug değil — bu
      // rotada okunur bir slug'ı taşıyan bir YOL segmenti zaten yoktur, yani
      // `SiteDetailTabs`in slug koruma gerekçesi burada geçerli DEĞİLDİR.
      projectKey={selected?.projectId ?? ""}
      siteKey={selected?.siteId ?? ""}
      chrome={
        <div className="diary__site-picker">
          <Select
            aria-label="Şantiye"
            value={selected?.siteId ?? ""}
            disabled={siteOptions.options.length === 0}
            onChange={(event) => pushSite(event.target.value)}
          >
            {siteOptions.options.length === 0 && (
              <option value="">
                {siteOptions.isLoading ? "Yükleniyor…" : "Şantiye yok"}
              </option>
            )}
            {siteOptions.options.map((option) => (
              <option key={option.siteId} value={option.siteId}>
                {option.label}
              </option>
            ))}
          </Select>
          {/* Boş gövdenin nedeni HER ZAMAN yazılır — sessiz boş ekran yok. */}
          {siteOptions.options.length === 0 && !siteOptions.isLoading && (
            <p className="diary__site-picker-empty">
              {siteOptions.isError
                ? "Şantiye listesi yüklenemedi."
                : "Kayıt girilebilecek şantiye bulunmuyor."}
            </p>
          )}
        </div>
      }
    />
  );
}
