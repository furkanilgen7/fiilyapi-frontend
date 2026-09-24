import { Select } from "@/components/ui/select";
import type { EvSiteGroup, EvSiteOption } from "@/lib/api/hooks/useEvSettings";

/**
 * Ekranın kendi şantiye seçicisi (K1 · Ek:68-92 · M7).
 *
 * Mockup özel bir açılır liste çizer (Ek:71-88: "ŞANTİYE" başlıklı kutu, proje
 * başlıklı gruplar, satır sonunda "tamamlandı · salt okunur" notu). Ham
 * `<select>` yasak, özel liste primitive'i YOK → `ui/Select` + `<optgroup>`.
 * Kapalı kutudaki "proje · şantiye" metni (Ek:73) seçenek etiketinden gelir;
 * satır notu (Ek:84) seçenek etiketinin sonuna eklenir.
 */
export function siteOptionLabel(option: EvSiteOption): string {
  const base = `${option.projectName} · ${option.siteName}`;
  return option.isCompleted ? `${base} · tamamlandı · salt okunur` : base;
}

export interface SiteSelectProps {
  groups: readonly EvSiteGroup[];
  value: string;
  onSelect: (siteId: string) => void;
  isLoading: boolean;
  isError: boolean;
}

export function SiteSelect({ groups, value, onSelect, isLoading, isError }: SiteSelectProps) {
  const isEmpty = groups.length === 0;
  const emptyLabel = isLoading ? "Yükleniyor…" : isError ? "Şantiye listesi yüklenemedi" : "Şantiye yok";
  return (
    <div className="ev-settings-site">
      {/* Ek:71-75 — "ŞANTİYE" başlığı kutunun içinde; Select kenarsız. */}
      <div className="ev-site-select">
        <span aria-hidden="true" className="ev-site-select__caption">
          Şantiye
        </span>
        <Select
          aria-label="Şantiye"
          value={value}
          disabled={isEmpty}
          onChange={(event) => onSelect(event.target.value)}
        >
          {isEmpty && <option value="">{emptyLabel}</option>}
          {groups.map((group) => (
            <optgroup key={group.projectId} label={group.projectName}>
              {group.sites.map((site) => (
                <option key={site.siteId} value={site.siteId}>
                  {siteOptionLabel(site)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      {/* Ek:91 — alan ipucu. */}
      <span className="ev-settings-site__hint">
        Ayarlar yalnız bu şantiyeye uygulanır · yeni şantiye sabit varsayılanlarla açılır
      </span>
    </div>
  );
}
