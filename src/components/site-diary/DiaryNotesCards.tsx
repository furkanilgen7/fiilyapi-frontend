import { Textarea } from "@/components/ui/textarea/Textarea";

import { DIARY_CHIEF_NOTE_MAX, DIARY_WORK_DONE_MAX } from "./diary-labels";

export interface DiaryTextCardProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/** GK268-272 · "📝 Yapılan İşler" kartı (tek textarea, GK271). */
export function DiaryWorkDoneCard({ value, onChange, disabled }: DiaryTextCardProps) {
  return (
    <section className="diary-card" aria-labelledby="diary-work-done-title">
      <h2 className="diary-card__title" id="diary-work-done-title">
        📝 Yapılan İşler
      </h2>
      <Textarea
        aria-labelledby="diary-work-done-title"
        className="diary-textarea diary-textarea--lg"
        placeholder="Bugün ne yapıldı? Tamamlanan pozlar, önemli gelişmeler..."
        maxLength={DIARY_WORK_DONE_MAX}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}

/**
 * E7 141-144 · "Şantiye Şefi Notu" kartı.
 *
 * GK'de bu kart YOKTUR; E7'nin (eski sürüm) öğesidir ve backend `chief_note`
 * alanını TAŞIDIĞI için spec §2 gereği basılır.
 */
export function DiaryChiefNoteCard({ value, onChange, disabled }: DiaryTextCardProps) {
  return (
    <section className="diary-card" aria-labelledby="diary-chief-note-title">
      <h2 className="diary-card__title" id="diary-chief-note-title">
        Şantiye Şefi Notu
      </h2>
      <Textarea
        aria-labelledby="diary-chief-note-title"
        className="diary-textarea"
        placeholder="Önemli notlar, uyarılar..."
        maxLength={DIARY_CHIEF_NOTE_MAX}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
