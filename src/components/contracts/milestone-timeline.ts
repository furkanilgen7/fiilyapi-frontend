import { isIsoDate } from "@/components/site-planning/week";
import type { SectionStatus } from "@/components/project-timeline/palette";
import type { TimelineProject } from "@/lib/api/hooks/useProjectTimeline";
import { formatMonthShort, formatPeriodShort } from "@/lib/format";

/**
 * F-MILESTONE · E14 99-123 "Milestone Takvimi" kartının SAF aritmetiği.
 *
 * ─── KÜME (kullanıcı kararı 2026-08-29) ───────────────────────────────────
 * İşveren sözleşmesinin milestone kümesi = **PROJENİN TÜM BÖLÜMLERİNİN**
 * milestone'ları. Sözleşmenin poz taşıdığı bölümlerle SINIRLANMAZ; kaynak
 * `GET /projects/timeline`in o projeye ait `sections[].milestones` gövdesidir.
 *
 * ─── 🔴 DURUM KOLONU YOKTUR — TÜRETİLİR, İCAT EDİLMEZ ─────────────────────
 * `TimelineMilestone` şemasının kendi açıklaması (schema.d.ts 18209-18212)
 * kuralı BİREBİR yazar:
 *
 *   "Durum alani YOKTUR (§6 S2): 'Tamamlandi' gorunumu `milestone_date < today`
 *    TUREVIDIR ve istemci `today` damgasiyla hesaplar."
 *
 * Sınır bu cümlededir ve UYDURULMAZ: KESİN KÜÇÜKTÜR. `milestone_date == today`
 * olan bir milestone HENÜZ GEÇMEMİŞTİR → "Tamamlandı" DEĞİLDİR.
 *
 * 🔴 `today` SUNUCU damgasıdır (`ProjectTimelineResponse.today`, `core.
 * timezone`). `new Date()` KULLANILMAZ: istemcinin saat dilimi/saati sunucudan
 * ayrışırsa AYNI milestone iki kullanıcıda İKİ FARKLI durumda görünürdü.
 *
 * ─── ÜÇÜNCÜ DURUM ("Devam Ediyor") NEREDEN GELİR ──────────────────────────
 * Tek bir tarihten İKİ durum çıkar (geçti / geçmedi) — üçüncüsü çıkmaz. Nokta
 * olayı "devam ediyor" olamaz; SÜREN şey onu İÇEREN bölümdür. Bu yüzden üçüncü
 * durum `TimelineSection.status`tan gelir ve BÖLÜM satırında basılır
 * (`SectionStatus`: planned/active/on_hold/completed).
 *
 * Etiketler `palette.ts`in `STATUS_LEGEND`inden okunur, KOPYALANMAZ —
 * `MilestoneState` bilerek `SectionStatus`un ALT KÜMESİDİR ki iki yüzey aynı
 * sözlüğü paylaşsın ve lejant bir gün değişirse ikisi birden değişsin.
 */
export type MilestoneState = Extract<SectionStatus, "completed" | "planned">;

/**
 * Şema açıklamasının kuralı, tek satır: KESİN KÜÇÜKTÜR.
 *
 * Ayrıştırılamayan tarih "tamamlandı" SAYILMAZ — geçmişte olduğunu ölçemediğin
 * bir şeyi bitmiş ilan etmek uydurmadır (`summary.ts`in `isIsoDate` korkuluğuyla
 * aynı gerekçe).
 */
export function milestoneState(milestoneDate: string, today: string): MilestoneState {
  if (!isIsoDate(milestoneDate) || !isIsoDate(today)) return "planned";
  return milestoneDate < today ? "completed" : "planned";
}

/**
 * Bölümün GERÇEK ay aralığı (mockup 105/109/113/117: "Nis–Tem 2025").
 *
 * 🔴 ARALIK YALNIZ BÖLÜM DÜZEYİNDE VARDIR: `TimelineSection` `start_date` +
 * `end_date` taşır, `TimelineMilestone` yalnız TEK `milestone_date` taşır.
 * Milestone için aralık BASILMAZ — uydurma bir aralık sahada yanlış karar
 * verdirirdi.
 *
 * Tarihlerden biri boş/bozuksa `null` döner: satır listede KALIR, yalnız
 * aralığı yazılmaz (`ProjectTimelineView`in "tarihi girilmemiş satır bar
 * çizmez, satır listede kalır" kararıyla aynı).
 */
export function sectionRangeLabel(start: string | null, end: string | null): string | null {
  if (start === null || end === null) return null;
  if (!isIsoDate(start) || !isIsoDate(end)) return null;

  const [startYear, startMonth] = start.split("-").map(Number) as [number, number];
  const [endYear, endMonth] = end.split("-").map(Number) as [number, number];

  // Tek ay: mockup 121'in son satırı ("Ara 2026") — aralık çizgisi YOK.
  if (startYear === endYear && startMonth === endMonth) {
    return formatPeriodShort(startYear, startMonth);
  }
  // Aynı yıl: yıl BİR KEZ yazılır ("Nis–Tem 2025", mockup 105).
  if (startYear === endYear) {
    return `${formatMonthShort(startMonth)}–${formatPeriodShort(endYear, endMonth)}`;
  }
  return `${formatPeriodShort(startYear, startMonth)}–${formatPeriodShort(endYear, endMonth)}`;
}

export interface MilestoneRow {
  id: string;
  title: string;
  /** `YYYY-MM-DD` — ekranda TAM tarih basılır, aralık DEĞİL. */
  date: string;
  state: MilestoneState;
}

export interface MilestoneGroup {
  sectionId: string;
  sectionName: string;
  /** Üçüncü durumun ("Devam Ediyor") TEK kaynağı. */
  status: SectionStatus;
  /** Gerçek ay aralığı; tarihler eksikse `null` (uydurulmaz). */
  range: string | null;
  /** En az BİR eleman — milestone'suz bölüm grup ÜRETMEZ. */
  milestones: readonly MilestoneRow[];
}

/**
 * Kartın üç AYRIK hâli. `ProgressPaymentsListBody`nin `emptyScope` deseni:
 * iki bağımsız boolean dört hâl üretirdi ve ikisi anlamsız olurdu.
 *
 * 🔴 `empty` ile `out-of-scope` AYRI CÜMLELERDİR ve karıştırılamaz:
 * `/projects/timeline` gövdesi `service.visible_projects` KAPISINDAN geçer
 * (backend `app/modules/projects/timeline.py`). Proje `items`te YOKSA doğru
 * cümle "milestone yok" değil, "bu proje senin kapsamında görünmüyor"dur.
 */
export type MilestoneTimeline =
  | { kind: "groups"; groups: readonly MilestoneGroup[] }
  | { kind: "empty" }
  | { kind: "out-of-scope" };

/**
 * ISO tarihleri DİZE olarak kıyaslar — `YYYY-MM-DD` sözlük sırası takvim
 * sırasıdır ve `new Date()` KULLANMAZ (UTC yorumu TR saatinde bir gün kaydırır,
 * `formatDayMonth`in aynı gerekçesi).
 */
function compareIso(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

/** Grubun kronolojik yeri: İÇERDİĞİ EN ERKEN milestone. Grup boşsa üretilmez. */
function earliestDate(milestones: readonly MilestoneRow[]): string {
  return milestones.reduce((min, row) => (row.date < min ? row.date : min), milestones[0]!.date);
}

/**
 * Projenin TÜM bölümlerinin milestone'larını, bölüme göre gruplanmış ve
 * KRONOLOJİK sırada döndürür.
 *
 * 🔴 SIRALAMA VERİDEN TÜRER, İCAT EDİLMEZ: kart bir TAKVİMdir (mockup 101-121
 * satırları zamanda artar). Bölümler içerdikleri EN ERKEN milestone'a göre
 * dizilir — her basılan grubun en az bir milestone'u olduğu için bu değer HER
 * ZAMAN tanımlıdır, "tarihi yoksa nereye koyayım" diye bir tahmin dalı açılmaz.
 * Eşitlikte sunucunun verdiği bölüm sırası korunur (`Array.sort` kararlıdır).
 *
 * 🔴 MİLESTONE'SUZ BÖLÜM BASILMAZ: küme kararı "bölümlerin MILESTONE'LARI"dır.
 * Boş bir bölüm başlığı kümeye ait olmayan bir satır eklerdi.
 */
export function buildMilestoneTimeline(
  items: readonly TimelineProject[],
  projectId: string,
  today: string,
): MilestoneTimeline {
  const project = items.find((item) => item.id === projectId);
  if (project === undefined) return { kind: "out-of-scope" };

  const groups = project.sections
    .map((section) => ({
      sectionId: section.id,
      sectionName: section.name,
      status: section.status,
      range: sectionRangeLabel(section.start_date, section.end_date),
      milestones: [...section.milestones]
        .sort((a, b) => compareIso(a.milestone_date, b.milestone_date))
        .map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          date: milestone.milestone_date,
          state: milestoneState(milestone.milestone_date, today),
        })),
    }))
    .filter((group) => group.milestones.length > 0)
    .sort((a, b) => compareIso(earliestDate(a.milestones), earliestDate(b.milestones)));

  if (groups.length === 0) return { kind: "empty" };
  return { kind: "groups", groups };
}
