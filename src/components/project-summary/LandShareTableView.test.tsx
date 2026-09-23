import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LandShareTableView } from "./LandShareTableView";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useLandShareSummary, useLandShareUnits } from "@/lib/api/hooks/useLandShare";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useLandShare", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useLandShare")>()),
  useLandShareSummary: vi.fn(),
  useLandShareUnits: vi.fn(),
}));

function errorStub(error: unknown) {
  return { data: undefined, isLoading: false, isError: true, error } as never;
}

function idleStub() {
  return { data: undefined, isLoading: false, isError: false, error: null } as never;
}

describe("LandShareTableView — proje sorgusu hata verdiğinde", () => {
  it("🔴 projectQuery 500/404 dönerse SONSUZA KADAR 'Yükleniyor…' basmaz, hata mesajı gösterir", () => {
    vi.mocked(useProject).mockReturnValue(errorStub(new BackendError(500, { detail: "sunucu hatası" })));
    // Proje çözülemediği için projectId boş kalır ⇒ bağımlı sorgular idle'dır.
    vi.mocked(useLandShareSummary).mockReturnValue(idleStub());
    vi.mocked(useLandShareUnits).mockReturnValue(idleStub());

    render(<LandShareTableView projectKey="bozuk-proje" activePath="/projeler/bozuk-proje/paylasim" />);

    expect(screen.getByText("Proje yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByText("Yükleniyor…")).not.toBeInTheDocument();
  });
});

// Kayıt 209 — 404 (kat karşılığı sözleşmesi yok) dalı sekme şeridini
// basmıyordu; kullanıcı geri gitmek için şeritten çıkamıyordu.
describe("LandShareTableView — kat karşılığı sözleşmesi YOK (404) dalı", () => {
  it("açıklayıcı boş hâli basar VE sekme şeridini KORUR", () => {
    vi.mocked(useProject).mockReturnValue({
      data: { id: "p-1", project_type: "kat_karsiligi" },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useLandShareSummary).mockReturnValue(
      errorStub(new BackendError(404, { detail: "yok" })),
    );
    vi.mocked(useLandShareUnits).mockReturnValue(idleStub());

    render(<LandShareTableView projectKey="p-1" activePath="/projeler/p-1/paylasim" />);

    expect(
      screen.getByText(/kat karşılığı sözleşmesi tanımlı değil/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Proje detay sekmeleri" }),
    ).toBeInTheDocument();
  });
});
