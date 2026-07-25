import { Suspense } from "react";
import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { RolesScreen } from "@/components/settings/roles/RolesScreen";

export default function RollerPage() {
  return (
    <>
      <SettingsHeader title="Rol Yönetimi" subtitle="Rolleri ve modül erişim yetkilerini özelleştirin" />
      <Suspense fallback={<p className="settings-note">Yükleniyor…</p>}>
        <RolesScreen />
      </Suspense>
    </>
  );
}
