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
