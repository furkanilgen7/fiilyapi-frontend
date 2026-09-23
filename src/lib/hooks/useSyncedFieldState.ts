"use client";

import { useRef, useState } from "react";

/**
 * `useState(() => sunucuDegeri)` yalnız ilk render'da kurulur — bileşen
 * remount olmadan sunucu/taslak değeri değişirse (kaydetme sonrası
 * invalidation, hafta/taslak güncellemesi) yerel state SESSİZCE BAYATLAŞIR
 * ve kullanıcı dokunmadan gönderirse ESKİ değer geri yazılır.
 *
 * 🔴 KANON (2026-09-23, onarım O1): bu kusur AYNI SINIFTAN iki bağımsız
 * yerde doğdu — puantaj hücresi (`TimesheetWeekTable`) ve bordro satırı
 * (`PayrollLineRow`). Üçüncü bir yerde tekrar doğmasın diye ORTAK bir
 * kontrollü-girdi deseni burada kapatılır.
 *
 * Alan ODAKTAYKEN (`isEditing() === true`) senkron ERTELENİR: aksi hâlde
 * kullanıcı yazarken araya giren bir refetch, henüz göndermediği
 * tuş vuruşlarını ezerdi. Odak bırakılınca (blur/commit) bir sonraki
 * sunucu değeri normal şekilde işlenir.
 *
 * React'in "önceki render'dan bilgi saklama" deseniyle (bkz. React docs,
 * "Adjusting state when a prop changes") render SIRASINDA senkronize eder —
 * `useEffect` kullanmaz, çünkü effect bir kare GECİKMELİ çalışır ve o karede
 * kullanıcı eski değeri görür/düzenleyebilir.
 */
export function useSyncedFieldState<T>(
  serverValue: T,
  isEditing: () => boolean = () => false,
): [T, (value: T) => void] {
  const [value, setValue] = useState(serverValue);
  const previousServerValue = useRef(serverValue);

  if (previousServerValue.current !== serverValue) {
    previousServerValue.current = serverValue;
    if (!isEditing() && value !== serverValue) {
      setValue(serverValue);
    }
  }

  return [value, setValue];
}
