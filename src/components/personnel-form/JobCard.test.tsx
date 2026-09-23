import { describe, it, expect } from "vitest";

import { projectNote } from "./JobCard";

describe("JobCard — projectNote", () => {
  it("🔴 proje listesi boşken 'projeye atamadan kaydedebilirsiniz' YALANINI söylemez (backend yayında zorunlu tutuyor)", () => {
    const note = projectNote({ isLoading: false, isError: false, items: [] });

    expect(note).not.toBe(
      "Kayıtlı proje yok — personeli projeye atamadan kaydedebilirsiniz.",
    );
    expect(note).toContain("yayımla");
  });
});
