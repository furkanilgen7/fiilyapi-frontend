/** Proje formu paylaşılan tipler (spec §4). */

export type ProjectType = "taahhut" | "kendi_yatirim" | "kat_karsiligi";

/** UI'da seçilebilir durumlar — `completed` backend'de var ama açılırda yok (§7.2). */
export type ProjectStatusOption = "planning" | "active" | "on_hold";

export interface BasicInfoValues {
  name: string;
  code: string;
  category: string;
  status: ProjectStatusOption;
  city: string;
  parcel: string;
  address: string;
}
