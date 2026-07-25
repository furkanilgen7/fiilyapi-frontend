import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { BackupScreen } from "@/components/settings/backup/BackupScreen";

export default function YedeklemePage() {
  return (
    <>
      <SettingsHeader title="Yedekleme & Geri Yükleme" subtitle="Verilerinizi güvende tutun" />
      <BackupScreen />
    </>
  );
}
