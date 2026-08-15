import { describe, it, expect } from "vitest";

import { buildPersonnelDocumentBody } from "./build-body";
import { OTHER_TYPE_VALUE } from "./constants";
import type { PersonnelDocumentFormValues } from "./validate";

const TYPE_ID = "tttttttt-0000-0000-0000-000000000001";
const DOCUMENT_ID = "dddddddd-0000-0000-0000-000000000001";

function values(overrides: Partial<PersonnelDocumentFormValues> = {}): PersonnelDocumentFormValues {
  return {
    file: null,
    typeId: TYPE_ID,
    freeLabel: "",
    issuedAt: "",
    validUntil: "",
    note: "",
    ...overrides,
  };
}

describe("buildPersonnelDocumentBody", () => {
  it("katalog tipinde YALNIZ `type_id` taşınır (XOR)", () => {
    const body = buildPersonnelDocumentBody(values(), null);
    expect(body).toEqual({ type_id: TYPE_ID });
    expect(body).not.toHaveProperty("free_label");
  });

  it('"Diğer…" seçiliyken YALNIZ `free_label` taşınır (XOR)', () => {
    const body = buildPersonnelDocumentBody(
      values({ typeId: OTHER_TYPE_VALUE, freeLabel: "  Vinç Belgesi  " }),
      null,
    );
    expect(body).toEqual({ free_label: "Vinç Belgesi" });
    expect(body).not.toHaveProperty("type_id");
  });

  it("boş bırakılan isteğe bağlı alanlar gövdeye HİÇ girmez", () => {
    const body = buildPersonnelDocumentBody(values(), null);
    expect(Object.keys(body)).toEqual(["type_id"]);
  });

  it("dolu alanlar kırpılarak taşınır", () => {
    expect(
      buildPersonnelDocumentBody(
        values({ issuedAt: "2026-01-15", validUntil: "2027-01-15", note: "  Sağlık Ocağı  " }),
        null,
      ),
    ).toEqual({
      type_id: TYPE_ID,
      issued_at: "2026-01-15",
      valid_until: "2027-01-15",
      note: "Sağlık Ocağı",
    });
  });

  it("iki adımlı akışın künyesi `document_id` olarak bağlanır", () => {
    expect(buildPersonnelDocumentBody(values(), DOCUMENT_ID)).toEqual({
      type_id: TYPE_ID,
      document_id: DOCUMENT_ID,
    });
  });

  it("künye yoksa `document_id` gövdede YOKTUR (dosyasız takip)", () => {
    expect(buildPersonnelDocumentBody(values(), null)).not.toHaveProperty("document_id");
  });
});
