"use client";

import { sectionStatusLabel } from "@/components/project-timeline/palette";
import { useProject } from "@/lib/api/hooks/useProjects";
import {
  useProjectTimeline,
  type ProjectTimelineResponse,
} from "@/lib/api/hooks/useProjectTimeline";
import { isForbidden } from "@/lib/api/unwrap";
import { formatDateLong } from "@/lib/format";

import { buildMilestoneTimeline, type MilestoneGroup } from "./milestone-timeline";
import "./employer-contract-detail.css";

/**
 * E14 99-123 · "Milestone Takvimi" — **CANLI** (F-MILESTONE).
 *
 * ─── ESKİ GEREKÇE ÇÜRÜTÜLDÜ ───────────────────────────────────────────────
 * Bu kart aylarca PENDING durdu; gerekçesi *"proje takvimini veren bir uç bu
 * repoda YOK"*tu. ÖLÇÜLDÜ: `GET /projects/timeline` VAR ve canlıda
 * (`schema.d.ts:3639`, backend `app/modules/projects/timeline.py`). Uç, P11
 * dilimiyle bu kart yazıldıktan SONRA indi; gerekçe bayatlamıştı.
 *
 * `EmployerContractDetail.milestones` şemada HÂLÂ `null`dur ve BU DİLİMDE
 * DEĞİŞMEZ (doldurmak `null` → dizi KIRICI sözleşme değişikliği olurdu).
 * Kart veriyi sözleşme gövdesinden değil, PROJE TAKVİMİNDEN okur.
 *
 * ─── 🔴 İKİNCİ İSTEK YOK ──────────────────────────────────────────────────
 * İki sorgu da PAYLAŞILAN hook'lardır ve anahtarları ekranın kendi
 * anahtarlarıyla BİREBİR aynıdır (`useCrumbNames` K5 kanonu):
 *
 *   useProjectTimeline()   → ["project-timeline"]   · Gantt ekranıyla AYNI
 *   useProject(projectId)  → ["project", <id>]      · üst görünümle AYNI
 *
 * `EmployerContractDetailView` `useProject(projectId)`i ZATEN çağırıyor →
 * React Query aynı anahtarda tek istek açar, ikinci gözlemci önbelleğe biner.
 * Karta ÖZEL bir `useQuery` verilseydi (kendi anahtarı) hem bu paylaşım hem
 * Gantt'tan gelen sıcak önbellek kaybolurdu.
 *
 * ─── 🔴 KİMLİK ÇÖZÜMLEME ──────────────────────────────────────────────────
 * Rota segmenti UUID **ya da SLUG** olabilir (URL-2: `/projects/{project_id}`
 * ikisini de kabul eder) ama `TimelineProject` yalnız `id` + `code` taşır,
 * SLUG TAŞIMAZ. Bu yüzden eşleştirme segmentle DEĞİL, proje detayının
 * döndürdüğü KANONİK `id` ile yapılır — slug'lı URL'de aksi hâlde kart sessizce
 * "kapsam dışı" derdi.
 *
 * ─── UYDURMA VERİ YOK ─────────────────────────────────────────────────────
 * Mockup'ın beş sahte milestone metni ("Temel ve Bodrum Katlar" … "Teslimat &
 * Kesin Kabul") BASILMAZ. Yükleme sırasında yalnız `aria-hidden` bir iskelet
 * durur ve gerçek veri gelince KALKAR.
 */

/** 101-121: mockup'taki satır sayısı — yalnız YÜKLEME iskeletinin boyu. */
const SKELETON_ROWS = 5;

export interface ContractMilestonesCardProps {
  /** Rota segmenti: UUID **ya da** slug (üst görünümün `projectId`si). */
  projectId: string;
}

export function ContractMilestonesCard({ projectId }: ContractMilestonesCardProps) {
  const timelineQuery = useProjectTimeline();
  const projectQuery = useProject(projectId);

  return (
    <section className="ecd-card" aria-labelledby="ecd-milestones-title">
      {/* 100 */}
      <h2 className="ecd-card__title" id="ecd-milestones-title">
        Milestone Takvimi
      </h2>
      <MilestonesBody
        isForbidden={isForbidden(timelineQuery.error) || isForbidden(projectQuery.error)}
        isError={timelineQuery.isError || projectQuery.isError}
        timeline={timelineQuery.data}
        projectUuid={projectQuery.data?.id}
      />
    </section>
  );
}

interface MilestonesBodyProps {
  /** 403 — `AccessDenied` DEĞİL: yalnız BU kart kapalıdır, ekranın kalanı açık. */
  isForbidden: boolean;
  isError: boolean;
  timeline: ProjectTimelineResponse | undefined;
  projectUuid: string | undefined;
}

function MilestonesBody({ isForbidden, isError, timeline, projectUuid }: MilestonesBodyProps) {
  /**
   * 🔴 403 GENEL HATAYA ÇÖKMEZ — ve bu hâl ULAŞILABİLİRDİR, ÖLÇÜLDÜ:
   * ekranın kendisi `contracts:view` ile korunur (backend `contracts/router.py:56`)
   * ama `/projects/timeline` `projects:view` ister (`projects/router.py:118`).
   * İKİ FARKLI MODÜL: `contracts` izni olup `projects` izni olmayan kullanıcı
   * sözleşmeyi GÖRÜR, takvimi göremez. O kullanıcıya "yüklenemedi" demek
   * geçici bir arıza vaat ederdi; doğru cümle yetki sınırını söyler.
   */
  if (isForbidden) {
    return (
      <>
        <p className="ecd-ms__message" data-testid="ecd-milestones-forbidden">
          Milestone takvimini görme yetkiniz yok.
        </p>
        <p className="ecd-ms__hint">
          Takvim `projeler` modülü izniyle açılır; sözleşme izni onu kapsamaz.
        </p>
      </>
    );
  }
  if (isError) {
    return (
      <p className="ecd-ms__message" data-testid="ecd-milestones-error">
        Milestone takvimi yüklenemedi
      </p>
    );
  }
  if (timeline === undefined || projectUuid === undefined) {
    return (
      <>
        <p className="ecd-ms__message" data-testid="ecd-milestones-loading">
          Yükleniyor…
        </p>
        <div className="ecd-ms__skeleton" aria-hidden="true">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div className="ecd-ms__skeleton-row" key={index}>
              <span className="ecd-ms__skeleton-dot" />
              <span className="ecd-ms__skeleton-line" />
            </div>
          ))}
        </div>
      </>
    );
  }

  const result = buildMilestoneTimeline(timeline.items, projectUuid, timeline.today);

  // 🔴 İKİ AYRI CÜMLE: "kayıt yok" ile "senin kapsamında görünmüyor" aynı şey
  // DEĞİLDİR. Tek cümleye indirilirse ekran, görme yetkisi olmayan kullanıcıya
  // projede milestone OLMADIĞINI söyler — bu bir YALANDIR.
  if (result.kind === "out-of-scope") {
    return (
      <>
        <p className="ecd-ms__message" data-testid="ecd-milestones-scope">
          Bu projenin takvimi kapsamınızda görünmüyor.
        </p>
        <p className="ecd-ms__hint">
          Proje takvimi yalnız görme yetkiniz olan projeleri döndürür.
        </p>
      </>
    );
  }
  if (result.kind === "empty") {
    return (
      <>
        <p className="ecd-ms__message" data-testid="ecd-milestones-empty">
          Bu projede kayıtlı milestone yok.
        </p>
        <p className="ecd-ms__hint">Milestone&apos;lar bölüm formunda girilir.</p>
      </>
    );
  }

  return (
    <ol className="ecd-ms" data-testid="ecd-milestones">
      {result.groups.map((group) => (
        <MilestoneGroupRows group={group} key={group.sectionId} />
      ))}
    </ol>
  );
}

function MilestoneGroupRows({ group }: { group: MilestoneGroup }) {
  // Aralık GERÇEKTİR (bölümün kendi `start_date`/`end_date`i); yoksa satır
  // yalnız durum etiketiyle basılır — uydurma aralık YOK.
  const statusLabel = sectionStatusLabel(group.status);
  const meta = group.range === null ? statusLabel : `${group.range} · ${statusLabel}`;

  return (
    <li className="ecd-ms__group" data-testid="ecd-ms-group">
      <div className="ecd-ms__row ecd-ms__row--section">
        <span className="ecd-ms__rail" aria-hidden="true">
          <span className={`ecd-ms__dot ecd-ms__dot--${group.status}`} />
          <span className="ecd-ms__line" />
        </span>
        <div className="ecd-ms__body">
          <p className="ecd-ms__name" data-testid="ecd-ms-section-name">
            {group.sectionName}
          </p>
          <p className="ecd-ms__meta" data-testid="ecd-ms-section-meta">
            {meta}
          </p>
        </div>
      </div>

      <ol className="ecd-ms__list">
        {group.milestones.map((milestone) => (
          <li
            className="ecd-ms__row ecd-ms__row--milestone"
            data-testid="ecd-ms-row"
            key={milestone.id}
          >
            <span className="ecd-ms__rail" aria-hidden="true">
              <span className={`ecd-ms__dot ecd-ms__dot--small ecd-ms__dot--${milestone.state}`} />
              <span className="ecd-ms__line" />
            </span>
            <div className="ecd-ms__body">
              <p className="ecd-ms__title" data-testid="ecd-ms-title">
                {milestone.title}
              </p>
              {/* TAM tarih — milestone'un aralığı YOKTUR (şemada tek `milestone_date`). */}
              <p className="ecd-ms__meta" data-testid="ecd-ms-meta">
                {formatDateLong(milestone.date)} · {sectionStatusLabel(milestone.state)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </li>
  );
}
