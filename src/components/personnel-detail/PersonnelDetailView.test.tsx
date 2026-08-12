import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { PersonnelDetailView } from "./PersonnelDetailView";
import { usePersonnelDetail } from "@/lib/api/hooks/usePersonnelDetail";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "per-9" }),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/usePersonnelDetail", () => ({ usePersonnelDetail: vi.fn() }));

const PERSON = {
  id: "per-9",
  full_name: "Mehmet Yılmaz",
  trade: "Kalıpçı Usta",
  source: "company" as const,
  subcontractor_id: null,
  user_id: null,
  is_active: true,
};

function mockSession(level: string) {
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: { personnel: level } } as unknown as MeResponse,
    isLoading: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession("view");
  vi.mocked(usePersonnelDetail).mockReturnValue({
    data: PERSON,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
});

describe("PersonnelDetailView · başlık kartı (PD 29-63)", () => {
  it("GERÇEK alanlar basılır: ad · Aktif rozeti · Tür rozeti · meslek", () => {
    render(<PersonnelDetailView />);
    const header = screen.getByTestId("personnel-header-card");
    expect(header).toHaveTextContent("Mehmet Yılmaz");
    expect(header).toHaveTextContent("Aktif");
    expect(header).toHaveTextContent("Şirket");
    expect(header).toHaveTextContent("Kalıpçı Usta");
  });

  it("Pasif personel Pasif rozetini basar", () => {
    vi.mocked(usePersonnelDetail).mockReturnValue({
      data: { ...PERSON, is_active: false },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    render(<PersonnelDetailView />);
    expect(screen.getByTestId("personnel-header-card")).toHaveTextContent("Pasif");
  });

  it("telefon/e-posta/şehir/SGK/vergi/IBAN/ücret/Bu Ay Net PENDING — '—' + görünür gerekçe", () => {
    render(<PersonnelDetailView />);
    const header = screen.getByTestId("personnel-header-card");
    const pendingCells = header.querySelectorAll(
      ".pd-hero__contact-item--pending, .pd-hero__stat-value--pending, .pd-hero__strip-value--pending",
    );
    // 3 iletişim + 2 stat (ücret/net) + 4 şerit (SGK/İşeGiriş/Vergi/IBAN) = 9
    expect(pendingCells.length).toBe(9);
    for (const cell of pendingCells) {
      expect(cell.textContent).toContain("—");
      expect(cell).toHaveAttribute("title");
      expect(cell.getAttribute("title")).not.toBe("");
    }
  });

  it("'Düzenle' GERÇEK linktir; 'Bordroyu Gör' devre-dışıdır", () => {
    render(<PersonnelDetailView />);
    expect(screen.getByRole("link", { name: "Düzenle" })).toHaveAttribute(
      "href",
      "/personel/per-9/duzenle",
    );
    expect(screen.getByRole("button", { name: "Bordroyu Gör" })).toBeDisabled();
  });
});

describe("PersonnelDetailView · 4 pending kart", () => {
  it("Puantaj Özeti · İzin & Haklar · Proje Geçmişi · Belgeler kartları basılır ve gerekçeli", () => {
    render(<PersonnelDetailView />);
    for (const testId of [
      "personnel-timesheet-summary-card",
      "personnel-leave-card",
      "personnel-project-history-card",
      "personnel-documents-card",
    ]) {
      const card = screen.getByTestId(testId);
      expect(card).toBeVisible();
      expect(card.querySelector(".pd-card__pending-text")?.textContent?.length).toBeGreaterThan(0);
    }
  });

  it("Puantaj Özeti'nin 'Tümü →' bağlantısı GERÇEK /puantaj'a gider", () => {
    render(<PersonnelDetailView />);
    const card = screen.getByTestId("personnel-timesheet-summary-card");
    const link = card.querySelector("a");
    expect(link).toHaveAttribute("href", "/puantaj");
    expect(link).toHaveTextContent("Tümü →");
  });

  it("İzin & Haklar ve Proje Geçmişi kartlarında 'Tümü →' bağlantısı YOKTUR", () => {
    render(<PersonnelDetailView />);
    expect(screen.getByTestId("personnel-leave-card").querySelector("a")).toBeNull();
    expect(screen.getByTestId("personnel-project-history-card").querySelector("a")).toBeNull();
  });

  it("Belgeler kartındaki '+ Ekle' ve 'İndir' basılır ama devre-dışıdır", () => {
    render(<PersonnelDetailView />);
    const card = screen.getByTestId("personnel-documents-card");
    expect(card.querySelector(".pd-card__add-btn")).toBeDisabled();
    expect(card.querySelector(".pd-card__download-btn")).toBeDisabled();
  });

  it("Puantaj Özeti kartı EK SORGU ATMAZ — usePersonnelDetail YALNIZ BİR KEZ çağrılır", () => {
    render(<PersonnelDetailView />);
    // Ekran yalnız kendi detay sorgusunu atar; Puantaj Özeti kartı saf sunum
    // bileşenidir (`DiarySummaryTrendCard` deseni), kendi hook'unu ÇAĞIRMAZ.
    expect(vi.mocked(usePersonnelDetail)).toHaveBeenCalledTimes(1);
  });
});

describe("PersonnelDetailView · hata/boş durumlar", () => {
  it("yükleniyor durumunda sade mesaj basar", () => {
    vi.mocked(usePersonnelDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    render(<PersonnelDetailView />);
    expect(screen.getByText("Yükleniyor…")).toBeVisible();
  });

  it("bulunamayan personel için sade Türkçe mesaj basar", () => {
    vi.mocked(usePersonnelDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new BackendError(404, { detail: "personel yok" }),
    } as never);
    render(<PersonnelDetailView />);
    expect(screen.getByText("Personel bulunamadı.")).toBeVisible();
  });

  it("403 AccessDenied gösterir", () => {
    vi.mocked(usePersonnelDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new BackendError(403, { detail: "yetkisiz" }),
    } as never);
    render(<PersonnelDetailView />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("personnel izni 'none' olan AccessDenied görür", () => {
    mockSession("none");
    render(<PersonnelDetailView />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});
