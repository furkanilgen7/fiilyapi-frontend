"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/select/Select";
import { useEvSiteOptions, type EvSiteOption } from "@/lib/api/hooks/useEvSettings";
import { routes } from "@/lib/routes";

import { BudgetScreen } from "./BudgetScreen";

const SITE_PARAM = "site";

/**
 * PLN-F1.6 · Adam-Saat Bütçesi KÖK İKİZİ (`/planlama/adam-saat-butcesi?site=`),
 * kabuk nav'ının Planlama grubu (K21). Emsal `GeneralSiteDiaryView`:
 *   • şantiye seçici `useEvSiteOptions` (E5 etiket deseni), durum `?site=`de;
 *   • çözülemeyen/eksik `?site=` ilk seçeneğe hizalanır (adres ile ekran çelişmez);
 *   • `key` şantiyeye bağlı → şantiye değişince ekran yerel durumu SÖKÜLÜR
 *     (seçim, arama, açık popover başka şantiyeye sızmaz).
 * Seçenekler kanonik UUID taşır → `useSite` geçişi gerekmez. `useEvSiteOptions`
 * (AYP ile aynı kaynak, önbellek paylaşılır) şantiye DURUMUNU da taşır →
 * tamamlanmış şantiye salt okunur açılır (B1-12 · PLN-F1.6.2).
 */
export function GeneralManHourBudgetView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteOptions = useEvSiteOptions();
  const siteParam = searchParams.get(SITE_PARAM);
  // CEO d (AYP ile aynı): `?site=` yoksa ilk DEVAM EDEN şantiye; hepsi tamamlanmışsa ilk seçenek.
  // Tamamlanmış şantiye seçicide açıkça seçilebilir kalır (salt okunur açılır).
  const selected =
    siteOptions.options.find((o) => o.siteId === siteParam) ??
    siteOptions.options.find((o) => !o.isCompleted) ??
    siteOptions.options[0];

  function pushSite(siteId: string) {
    // Şantiye değişince revizyon/adım anahtarları o şantiyeye ait değildir — düşer.
    const params = new URLSearchParams();
    params.set(SITE_PARAM, siteId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (selected === undefined || siteParam === selected.siteId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(SITE_PARAM, selected.siteId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.siteId, siteParam]);

  const picker = <SitePicker state={siteOptions} value={selected?.siteId ?? ""} onChange={pushSite} />;

  // Seçilecek şantiye yoksa gövde iskeleti "yükleniyor" yalanı söylemez: yalnız seçici + gerekçe.
  if (selected === undefined && !siteOptions.isLoading) return <div className="ev-budget">{picker}</div>;
  const params = selected ? { projectId: selected.projectId, siteId: selected.siteId } : null;
  return (
    <BudgetScreen
      key={selected?.siteId ?? ""}
      siteCompleted={selected?.isCompleted ?? false}
      siteId={selected?.siteId ?? ""}
      picker={picker}
      links={{
        boq: params ? routes.projects.sites.boq(params) : null,
        sections: params ? routes.projects.sites.detail(params) : null,
        catalog: routes.planning.catalog(),
      }}
    />
  );
}

/** E5 78 etiketi (proje + şantiye); tamamlanmış şantiye işaretlenir (AYP `SiteSelect` deseni). */
function optionLabel(option: EvSiteOption): string {
  const base = `${option.projectName} ${option.siteName}`;
  return option.isCompleted ? `${base} · tamamlandı` : base;
}

interface SitePickerProps {
  state: ReturnType<typeof useEvSiteOptions>;
  value: string;
  onChange: (siteId: string) => void;
}

/** E5 deseni şantiye seçici; boş gövdenin nedeni HER ZAMAN yazılır. */
function SitePicker({ state, value, onChange }: SitePickerProps) {
  const empty = state.options.length === 0;
  return (
    <div className="ev-budget-site-picker">
      <Select aria-label="Şantiye" value={value} disabled={empty} onChange={(event) => onChange(event.target.value)}>
        {empty && <option value="">{state.isLoading ? "Yükleniyor…" : "Şantiye yok"}</option>}
        {state.options.map((option) => (
          <option key={option.siteId} value={option.siteId}>
            {optionLabel(option)}
          </option>
        ))}
      </Select>
      {empty && !state.isLoading && (
        <p className="ev-budget-site-picker__empty">
          {state.isError ? "Şantiye listesi yüklenemedi." : "Bütçesi hazırlanabilecek şantiye bulunmuyor."}
        </p>
      )}
    </div>
  );
}
