import type { FieldControlProps } from "@/components/ui";
import { userOptionLabel, type UserOption } from "@/lib/api/hooks/useUserOptions";
import { SELECT_PLACEHOLDER, USER_LIST_NOTES } from "./constants";

/**
 * Üç kişi seçicisinin (Şantiye Şefi, İSG Uzmanı, bölüm Sorumlusu) paylaştığı
 * durum yüzeyi. `useUserOptions()`'ın sonucundan türetilir — yeni sorgu açmaz.
 */
export interface UserPickerState {
  options: UserOption[];
  isLoading: boolean;
  isError: boolean;
  isForbidden: boolean;
}

/**
 * Liste yüklenemedi mi? 403 de, 500 de buraya düşer.
 *
 * ⚠️ Bu bayrak Şantiye Şefi'nin ZORUNLULUĞUNU da kaldırır (spec §10.1.1):
 * kullanıcının seçemediği bir alan zorunlu tutulamaz. Liste geldiğinde kural
 * aynen işler — gevşeme kalıcı değildir.
 */
export function isUserListUnavailable(state: UserPickerState): boolean {
  return state.isError;
}

export function isUserPickerDisabled(state: UserPickerState): boolean {
  return state.isLoading || state.isError;
}

/**
 * Seçicilerin altındaki açıklama. **Asla `null` dönmez** — sessiz boş açılır
 * liste yasaktır (GOREV-SIRASI §3, plan TZ-4b).
 */
export function userPickerNote(state: UserPickerState): string {
  if (state.isForbidden) return USER_LIST_NOTES.forbidden;
  if (state.isError) return USER_LIST_NOTES.error;
  if (state.isLoading) return USER_LIST_NOTES.loading;
  return USER_LIST_NOTES.incomplete;
}

/** Seçicinin `<option>` listesi — yükleme/hata durumunda tek bilgi seçeneği. */
export function UserPickerOptions({ state }: { state: UserPickerState }) {
  if (state.isLoading) return <option value="">{USER_LIST_NOTES.loading}</option>;
  return (
    <>
      <option value="">{SELECT_PLACEHOLDER}</option>
      {state.options.map((user) => (
        <option key={user.id} value={user.id}>
          {userOptionLabel(user)}
        </option>
      ))}
    </>
  );
}

/**
 * `Field`'in ürettiği `aria-describedby`'ı EZMEDEN ek bir açıklama bağlar.
 * Düz atama yapılırsa İSG ipucu ("İSG mevzuatı gereği zorunlu") kaybolur.
 */
export function withDescribedBy(control: FieldControlProps, extraId: string): FieldControlProps {
  const ids = [control["aria-describedby"], extraId].filter(Boolean).join(" ");
  return { ...control, "aria-describedby": ids };
}
