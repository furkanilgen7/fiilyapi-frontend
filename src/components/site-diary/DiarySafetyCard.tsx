import { Checkbox } from "@/components/ui/checkbox/Checkbox";
import { Textarea } from "@/components/ui/textarea/Textarea";

import { DIARY_INCIDENT_NOTE_MAX } from "./diary-labels";
import type { DiaryFormState } from "./form-state";

export interface DiarySafetyCardProps {
  form: DiaryFormState;
  onChange: (patch: Partial<DiaryFormState>) => void;
  disabled: boolean;
}

/**
 * GK440-449 · "⛑ İş Güvenliği" kartı (E7 176-197 ile aynı üç kutucuk).
 * Üç kutucuk + olay notu backend'de gerçek alanlardır
 * (`safety_meeting_held` / `ppe_checked` / `has_incident` / `incident_note`).
 */
export function DiarySafetyCard({ form, onChange, disabled }: DiarySafetyCardProps) {
  return (
    <section className="diary-card diary-card--side" aria-labelledby="diary-safety-title">
      <h2 className="diary-card__title" id="diary-safety-title">
        ⛑ İş Güvenliği
      </h2>
      <div className="diary-safety__list">
        {/* GK444 */}
        <Checkbox
          label="Sabah İSG toplantısı"
          checked={form.safetyMeetingHeld}
          disabled={disabled}
          onChange={(event) => onChange({ safetyMeetingHeld: event.target.checked })}
        />
        {/* GK445 */}
        <Checkbox
          label="KKD kontrolü yapıldı"
          checked={form.ppeChecked}
          disabled={disabled}
          onChange={(event) => onChange({ ppeChecked: event.target.checked })}
        />
        {/* GK446 */}
        <Checkbox
          label="Ramak kala / Kaza var"
          checked={form.hasIncident}
          disabled={disabled}
          onChange={(event) => onChange({ hasIncident: event.target.checked })}
        />
        {/* GK447 */}
        <Textarea
          className="diary-textarea diary-textarea--sm"
          aria-label="Olay notu"
          placeholder="Varsa olay notu..."
          maxLength={DIARY_INCIDENT_NOTE_MAX}
          value={form.incidentNote}
          disabled={disabled}
          onChange={(event) => onChange({ incidentNote: event.target.value })}
        />
      </div>
    </section>
  );
}
