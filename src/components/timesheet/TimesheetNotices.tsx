import { listTruncationMessage, type ListTruncation } from "@/lib/list-truncation";

export interface TimesheetNoticesProps {
  canWrite: boolean;
  isPersonnelUnavailable: boolean;
  personnelTruncation: ListTruncation;
}

/**
 * Devre-dışı bırakılmış yüzeylerin GÖRÜNÜR Türkçe gerekçeleri.
 *
 * Üst kural: backendi ya da çizimi olmayan parça SİLİNMEZ — devre-dışı basılır
 * ve nedeni ekranda yazar. Sessiz atlama yok.
 *
 * `role="alert"` KULLANILMAZ (F-P6 dersi; e2e'de yasak).
 */
export function TimesheetNotices({
  canWrite,
  isPersonnelUnavailable,
  personnelTruncation,
}: TimesheetNoticesProps) {
  const messages: string[] = [];

  if (!canWrite) {
    // Saha mühendisi (`timesheet: view`) — matris salt-okunur, hücreler
    // tıklanamaz, "Kaydet" devre dışı. Excel indirme OKUMA ucudur, açıktır.
    messages.push(
      "Puantaj kaydetme yetkiniz yok — matris salt-okunur gösteriliyor, hücreler düzenlenemez ve “Kaydet” devre dışı.",
    );
  }

  if (isPersonnelUnavailable) {
    messages.push(
      "Personel kartoteksi okunamadı — yalnız bu ayda kaydı olan personel listeleniyor, yeni satır açılamaz.",
    );
  } else if (personnelTruncation.isTruncated) {
    messages.push(listTruncationMessage(personnelTruncation));
  }

  return (
    <ul className="ts-notices">
      {messages.map((message) => (
        <li key={message} className="ts-notices__item">
          {message}
        </li>
      ))}
    </ul>
  );
}
