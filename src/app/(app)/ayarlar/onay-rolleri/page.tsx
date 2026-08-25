import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { ApprovalRolesScreen } from "@/components/settings/approvals/ApprovalRolesScreen";

export default function OnayRolleriPage() {
  return (
    <>
      <SettingsHeader
        variant="sub"
        title="Onay Rolleri ve Eşik"
        subtitle="Kimin neyi onaylayacağını ve hangi tutarın üstünde Patron onayı gerektiğini belirle"
      />
      <ApprovalRolesScreen />
    </>
  );
}
