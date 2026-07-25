import { Suspense } from "react";
import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { UsersScreen } from "@/components/settings/users/UsersScreen";

export default function KullanicilarPage() {
  return (
    <>
      <SettingsHeader variant="root" title="Ayarlar" subtitle="FİİL Yapı ERP sistem yönetimi" />
      <Suspense fallback={<p className="settings-note">Yükleniyor…</p>}>
        <UsersScreen />
      </Suspense>
    </>
  );
}
