import { SettingsSidebar } from "@/components/settings/shell/SettingsSidebar";
import { SettingsBreadcrumb } from "@/components/settings/shell/SettingsBreadcrumb";
import "./ayarlar.css";

export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsSidebar />
      <SettingsBreadcrumb />
      <div className="ayarlar-content">{children}</div>
    </>
  );
}
