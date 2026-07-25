import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { AuditLogScreen } from "@/components/settings/audit/AuditLogScreen";

export default function DenetimGunluguPage() {
  return (
    <>
      <SettingsHeader title="Denetim Günlüğü" subtitle="Sistemdeki tüm işlemler ve değişiklikler" />
      <AuditLogScreen />
    </>
  );
}
