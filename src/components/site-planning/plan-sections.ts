import type { SectionListResponse } from "@/lib/api/hooks/useSiteSections";

/**
 * Satır ekleme popover'ının BÖLÜM seçeneği (F-PL T5).
 *
 * Neden ayrı bir model: ızgaranın grupları YALNIZ mevcut satırlardan türer
 * (backend `build_week`), dolayısıyla henüz satırı olmayan bölüm ızgarada
 * görünmez. Seçenek listesi bu yüzden ızgaradan değil şantiyenin bölüm
 * listesinden beslenir.
 */
export interface PlanSectionOption {
  readonly id: string;
  readonly name: string;
  /** Grup başlığının ikinci hücresi (P123) yeni grupta da dolu başlasın diye. */
  readonly managerName: string | null;
}

export interface PlanSectionsState {
  readonly items: readonly PlanSectionOption[];
  readonly isLoading: boolean;
  readonly isError: boolean;
}

export const EMPTY_PLAN_SECTIONS: PlanSectionsState = {
  items: [],
  isLoading: false,
  isError: false,
};

/** Sunucu gövdesi → seçenek listesi. Sıra bölümün kendi `sort_order`ıdır. */
export function planSectionsState(
  data: SectionListResponse | undefined,
  isLoading: boolean,
  isError: boolean,
): PlanSectionsState {
  const items = (data?.items ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => ({
      id: section.id,
      name: section.name,
      managerName: section.manager_name,
    }));
  return { items, isLoading, isError };
}

/**
 * Seçicinin kısa gerekçesi — liste yüklenemez/boş olsa bile seçici GİZLENMEZ,
 * yalnız "Bölümsüz" seçeneğiyle kalır ve nedeni yazılır (sessiz atlama yok).
 * Liste doluyken gerekçe gerekmez.
 */
export function planSectionsHint(state: PlanSectionsState): string | null {
  if (state.isError) return "Bölüm listesi yüklenemedi; satır yalnız bölümsüz açılabilir.";
  if (state.isLoading) return "Bölümler yükleniyor…";
  if (state.items.length === 0) return "Bu şantiyede tanımlı bölüm yok.";
  return null;
}
