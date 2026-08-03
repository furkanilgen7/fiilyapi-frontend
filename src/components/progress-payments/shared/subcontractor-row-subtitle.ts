import { pendingModuleLabel } from "@/lib/pending-modules";

// F-TH T5 fix round 1 (coordinator review) — taşeron satırının alt metni
// BİLEŞİKTİR: "iş kategorisi · bölüm". Bu bileşik metnin mockup kanonu
// `Şantiye - Hakedişler.dc.html` satır 124'tür ("Betonarme İşleri · Kat 6–8");
// `Ekran 2 - Taşeron Hakedişi.dc.html` satır 141 YALNIZ kategoriyi taşır
// (final inceleme F-6: önceki atıf yanlıştı, davranış doğruydu). Önceki sürüm
// yalnız kategoriyi basıyor, bölüm bileşenini HİÇ render etmiyordu (iz
// bırakmadan kayboluyordu) — üst kuralın ("sessiz atlama = ihlal") ihlaliydi.
//
// İki bileşenin de kendi "bilinmiyor" hâli var ve bunlar FARKLI anlamlara
// gelir — AYRIŞTIRILMALARI GEREKİR:
// - iş kategorisi `null` → sözleşmede de tanımlı DEĞİL → pending (T2 deseni,
//   `pendingModuleLabel("work_category")`).
// - `sectionId === null` → hakediş GERÇEKTEN bölümsüz (proje/şantiye
//   genelinde bir kalem) → bu EKSİK VERİ DEĞİLDİR, "Tüm Bölümler" GERÇEK
//   metnidir, pending GÖSTERİLMEZ.
// - `sectionId` DOLU ama adı çözülemiyor (bu dilimde bölüm adını çözecek bir
//   uç/hook YOK, yalnız kimlik var — yeni bir istek EKLENMEDİ, N+1 artmadı)
//   → pending (`pendingModuleLabel("section_name")`).
//
// İkisi de pending ise "— · —" gibi anlamsız bir ikili YERİNE TEK, okunur bir
// pending gösterge (birleşik ipucuyla) basılır — hem "sessiz atlama yasak"
// hem "okunur bir sonuç üret" isteğinin karşılığı.
export type SubtitleSegment = { kind: "text"; value: string } | { kind: "pending"; title: string };

export interface SubcontractorRowSubtitle {
  /** `true` ise TEK birleşik pending gösterge basılır (`combinedPendingTitle`),
   * `segments` bu durumda BOŞTUR ve kullanılmaz. */
  isCombinedPending: boolean;
  combinedPendingTitle: string;
  /** `isCombinedPending=false` iken basılacak İKİ parça (kategori, bölüm),
   * aralarına `" · "` ayracı konur. */
  segments: SubtitleSegment[];
}

export function buildSubcontractorRowSubtitle(
  workCategory: string | null,
  sectionId: string | null,
): SubcontractorRowSubtitle {
  const categoryPending = workCategory === null;
  const sectionPending = sectionId !== null;

  if (categoryPending && sectionPending) {
    return {
      isCombinedPending: true,
      combinedPendingTitle: `${pendingModuleLabel("work_category")}; ${pendingModuleLabel("section_name")}`,
      segments: [],
    };
  }

  const categorySegment: SubtitleSegment = categoryPending
    ? { kind: "pending", title: pendingModuleLabel("work_category") }
    : { kind: "text", value: workCategory as string };
  const sectionSegment: SubtitleSegment = sectionPending
    ? { kind: "pending", title: pendingModuleLabel("section_name") }
    : { kind: "text", value: "Tüm Bölümler" };

  return { isCombinedPending: false, combinedPendingTitle: "", segments: [categorySegment, sectionSegment] };
}
