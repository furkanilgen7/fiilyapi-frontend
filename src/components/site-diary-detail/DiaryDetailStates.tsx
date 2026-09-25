import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AlertIcon, DocumentDashedIcon, PadlockIcon } from "@/components/ui/icons";

/**
 * DET-1.2 · Günlük kayıt detayının hâl kartları — mockup "Hâl kartları"
 * (d) yükleniyor · (e) bulunamadı · (f) yetkisiz · (g) hata.
 *
 * 🔴 §2.7: Planlama kitinin (`earned-value/common/state`) `Skeleton`/
 * `ErrorCard`ı İTHAL EDİLMEZ — günlük ÇEKİRDEK modüldür. Çizim aynı mockup
 * kaynaklarından (PNL:403-436, BÜT:476/500-505) burada yeniden kurulur.
 */

/** (d) PNL:432-436 + BÜT:500-505 — başlık çizgileri + üç KPI bloğu + tablo iskeleti. */
export function DiaryDetailSkeleton() {
  return (
    <div className="diary-detail__skeleton" role="status" aria-busy="true">
      <span className="sr-only">Günlük kayıt yükleniyor</span>
      <div className="diary-detail__sk-lines" aria-hidden="true">
        <span className="diary-detail__sk-bar diary-detail__sk-bar--title" />
        <span className="diary-detail__sk-bar diary-detail__sk-bar--sub" />
      </div>
      <div className="diary-detail__sk-blocks" aria-hidden="true">
        <span className="diary-detail__sk-block" />
        <span className="diary-detail__sk-block" />
        <span className="diary-detail__sk-block" />
      </div>
      <div className="diary-detail__sk-rows" aria-hidden="true">
        {["first", "second", "third"].map((row) => (
          <div key={row} className={`diary-detail__sk-row diary-detail__sk-row--${row}`}>
            <span className="diary-detail__sk-cell" />
            <span className="diary-detail__sk-cell diary-detail__sk-cell--wide" />
            <span className="diary-detail__sk-cell" />
            <span className="diary-detail__sk-cell" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** (e) PNL:403-408 kutusu + BÜT:476 kesikli belge — 404 / başka şantiyenin kaydı. */
export function DiaryDetailNotFound({ backHref }: { backHref: string }) {
  return (
    <div className="diary-detail__state" role="status">
      <DocumentDashedIcon className="diary-detail__state-icon" />
      <p className="diary-detail__state-title">Günlük kayıt bulunamadı</p>
      <p className="diary-detail__state-note">Kayıt silinmiş ya da bu şantiyeye ait değil.</p>
      <Link className="diary-detail__state-action" href={backHref}>
        Bölümün günlük kayıtlarına dön
      </Link>
    </div>
  );
}

/** (f) PNL:403-408 + PNL:440 kilit — site_diary görüntüleme izni yok. Düğme YOK. */
export function DiaryDetailForbidden() {
  return (
    <div className="diary-detail__state" role="status">
      <PadlockIcon className="diary-detail__state-icon" width={26} height={26} strokeWidth={1.3} />
      <p className="diary-detail__state-title">Günlük kayıtları görme yetkiniz yok</p>
      <p className="diary-detail__state-note">
        Şantiye Günlüğü modülü için görüntüleme izni gerekir. Yöneticinize başvurun.
      </p>
    </div>
  );
}

/** (g) PNL:424-431 — hata kartı + "Tekrar dene". */
export function DiaryDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="diary-detail__error" role="alert">
      <div className="diary-detail__error-head">
        <AlertIcon className="diary-detail__error-icon" width={17} height={17} />
        <span className="diary-detail__error-title">Günlük kayıt alınamadı</span>
      </div>
      <p className="diary-detail__error-note">Sunucu yanıt vermedi. Kayıt değişmedi.</p>
      <Button variant="secondary" size="sm" className="diary-detail__error-retry" onClick={onRetry}>
        Tekrar dene
      </Button>
    </div>
  );
}
