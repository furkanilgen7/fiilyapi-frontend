import { describe, it, expect } from "vitest";

import type { DocumentRead } from "@/lib/api/hooks/useDocuments";
import { RECENT_DOCUMENT_COUNT, recentDocuments } from "./recent-documents";

function doc(id: string, createdAt: string): DocumentRead {
  return {
    id,
    folder_id: null,
    project_id: "p-1",
    site_id: "s-1",
    filename: `${id}.pdf`,
    mime_type: "application/pdf",
    size_bytes: 1024,
    description: null,
    uploaded_by_name: "Ayşe Demir",
    created_at: createdAt,
  } as DocumentRead;
}

describe("recentDocuments — 'Son Eklenenler' sıralaması İSTEMCİDE (spec §3)", () => {
  it("mockup'taki gibi en fazla 3 satır döndürür (ŞB 137-164)", () => {
    expect(RECENT_DOCUMENT_COUNT).toBe(3);
    const all = [
      doc("a", "2026-07-10T06:00:00Z"),
      doc("b", "2026-07-11T06:00:00Z"),
      doc("c", "2026-07-12T06:00:00Z"),
      doc("d", "2026-07-13T06:00:00Z"),
    ];
    expect(recentDocuments(all).map((d) => d.id)).toEqual(["d", "c", "b"]);
  });

  it("en yeniden eskiye sıralar", () => {
    const all = [doc("eski", "2025-01-01T00:00:00Z"), doc("yeni", "2026-07-17T00:00:00Z")];
    expect(recentDocuments(all).map((d) => d.id)).toEqual(["yeni", "eski"]);
  });

  // Immutability (coding-style): girdi dizisi YERİNDE sıralanmaz.
  it("girdi dizisini DEĞİŞTİRMEZ", () => {
    const all = [doc("a", "2026-07-10T06:00:00Z"), doc("b", "2026-07-12T06:00:00Z")];
    const before = all.map((d) => d.id);
    recentDocuments(all);
    expect(all.map((d) => d.id)).toEqual(before);
  });

  it("eşit tarihlerde kimliğe göre kararlı sıralar (aynı saniyede yüklenen iki dosya)", () => {
    const all = [doc("z", "2026-07-10T06:00:00Z"), doc("a", "2026-07-10T06:00:00Z")];
    expect(recentDocuments(all).map((d) => d.id)).toEqual(["a", "z"]);
  });

  it("boş listede boş dizi döndürür (boş durum ekranda basılır)", () => {
    expect(recentDocuments([])).toEqual([]);
  });
});
