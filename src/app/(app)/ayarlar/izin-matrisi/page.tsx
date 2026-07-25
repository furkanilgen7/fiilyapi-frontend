import { Suspense } from "react";
import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { PermissionMatrix } from "@/components/settings/permissions/PermissionMatrix";

export default function IzinMatrisiPage() {
  return (
    <>
      <SettingsHeader
        variant="sub"
        title="İzin Matrisi"
        subtitle="Her rol için modül bazlı erişim düzeyini ayarlayın"
      />
      <Suspense fallback={<p className="settings-note">Yükleniyor…</p>}>
        <PermissionMatrix />
      </Suspense>
    </>
  );
}
