import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelScreen } from "./PanelScreen";
import type { ReportLinks } from "../kit/report-screen";

const LINKS: ReportLinks = {
  diary: () => "/gunluk-kayit",
  budget: "/planlama/adam-saat-butcesi",
  dailyReport: () => "/planlama/gunluk-rapor",
  weeklyReport: () => "/planlama/haftalik-qurr",
  panel: "/planlama/panel",
};

describe("PanelScreen (yer tutucu)", () => {
  it("başlığı basar", () => {
    render(
      <PanelScreen
        siteId="s-1"
        siteName="A-Blok"
        companyName="FİİL Yapı"
        projectName="Güneşkent Konut"
        siteCompleted={false}
        links={LINKS}
      />,
    );
    expect(screen.getByRole("heading", { name: "Planlama Paneli" })).toBeInTheDocument();
  });

  it("firma · proje · şantiye kırıntısını basar", () => {
    render(
      <PanelScreen
        siteId="s-1"
        siteName="A-Blok Şantiyesi"
        companyName="FİİL Yapı"
        projectName="Güneşkent Konut"
        siteCompleted={false}
        links={LINKS}
      />,
    );
    expect(screen.getByText("FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi")).toBeInTheDocument();
  });

  it("bilinmeyen alanlar boşsa kırıntı basılmaz", () => {
    render(<PanelScreen siteId="" siteName="" companyName="" projectName="" siteCompleted={false} links={LINKS} />);
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("kök ikizde picker basılır", () => {
    render(
      <PanelScreen
        siteId=""
        siteName=""
        companyName=""
        projectName=""
        siteCompleted={false}
        links={LINKS}
        picker={<button type="button">Şantiye seç</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Şantiye seç" })).toBeInTheDocument();
  });
});
