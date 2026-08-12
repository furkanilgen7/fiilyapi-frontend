import { DocumentsPlaceholderCard } from "@/components/form-shell";
import { Field, Textarea } from "@/components/ui";

import {
  MAX_LENGTH,
  STOCK_ENTRY_DOCUMENTS,
  STOCK_ENTRY_DOCUMENTS_PENDING_REASON,
  STOCK_ENTRY_DOCUMENTS_TITLE,
} from "./constants";

interface StockEntryDocumentsCardProps {
  note: string;
  error?: string;
  onChangeNote: (value: string) => void;
}

/**
 * Belgeler kartı (SG 149-172).
 *
 * Üç kutunun tamamı **BC form-slot bağına pending**'dir: gerçek yükleme YOK
 * (`<input type=file>` render edilmez), kutular `aria-disabled` + "Yakında"
 * rozetli, gerekçe hem `title`da hem kart başlığında GÖRÜNÜR. Gövdeye hiçbir
 * belge anahtarı eklenmez.
 *
 * Not alanı (169-171) mockup'ta bu kartın İÇİNDEDİR — paylaşılan kabuğun
 * `footer` yuvasına verilir, ayrı bir kart uydurulmaz.
 *
 * Mockup'ta 4. bir sürükle-bırak satırı YOKTUR; `dropTitle`/`dropSubtitle`
 * geçilmediği için o satır hiç basılmaz.
 */
export function StockEntryDocumentsCard({
  note,
  error,
  onChangeNote,
}: StockEntryDocumentsCardProps) {
  const remaining = MAX_LENGTH.note - note.length;
  return (
    <DocumentsPlaceholderCard
      title={STOCK_ENTRY_DOCUMENTS_TITLE}
      note={STOCK_ENTRY_DOCUMENTS_PENDING_REASON}
      items={STOCK_ENTRY_DOCUMENTS}
      soonTitle={STOCK_ENTRY_DOCUMENTS_PENDING_REASON}
      columns={3}
      footer={
        <div className="sgf-note">
          {/* 169-170 */}
          <Field
            label="Not / Açıklama"
            hint={`${remaining} karakter kaldı (en fazla ${MAX_LENGTH.note})`}
            error={error}
          >
            {(control) => (
              <Textarea
                {...control}
                rows={2}
                data-testid="stok-giris-not"
                maxLength={MAX_LENGTH.note}
                placeholder="Eksik teslimat, hasar, kalite notu..."
                value={note}
                onChange={(event) => onChangeNote(event.target.value)}
              />
            )}
          </Field>
        </div>
      }
    />
  );
}
