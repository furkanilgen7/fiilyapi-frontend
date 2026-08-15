import { describe, it, expect } from "vitest";

import { buildArchiveDocumentInput, buildEquipmentDocumentInput } from "./build-input";

const FILE = new File(["x"], "ruhsat.pdf", { type: "application/pdf" });
const EQUIPMENT_ID = "eeeeeeee-0000-0000-0000-000000000001";

describe("buildEquipmentDocumentInput (EKP)", () => {
  it("boş `valid_until` gövdeye HİÇ konmaz (boş dize 422 üretirdi)", () => {
    const input = buildEquipmentDocumentInput(
      EQUIPMENT_ID,
      { file: FILE, typeId: "t1", validUntil: "   " },
      FILE,
    );
    expect(input).toEqual({ equipmentId: EQUIPMENT_ID, file: FILE, typeId: "t1" });
    expect("validUntil" in input).toBe(false);
  });

  it("dolu `valid_until` aynen taşınır", () => {
    expect(
      buildEquipmentDocumentInput(
        EQUIPMENT_ID,
        { file: FILE, typeId: "t1", validUntil: "2027-03-01" },
        FILE,
      ).validUntil,
    ).toBe("2027-03-01");
  });

  it("🔴 devre-dışı alanların (Belge No 111-114 · Düzenlenme Tarihi 115-118 · Not 147-151) gövdede karşılığı YOKTUR", () => {
    const input = buildEquipmentDocumentInput(
      EQUIPMENT_ID,
      { file: FILE, typeId: "t1", validUntil: "" },
      FILE,
    );
    expect(Object.keys(input).sort()).toEqual(["equipmentId", "file", "typeId"]);
  });
});

describe("buildArchiveDocumentInput (ARŞ)", () => {
  const base = { file: FILE, projectId: "p1", siteId: "", folderId: "", description: "" };

  it("boş şantiye/klasör/açıklama gövdeye HİÇ konmaz (kapsam semantiği)", () => {
    const input = buildArchiveDocumentInput(base, FILE);
    expect(input).toEqual({ file: FILE, projectId: "p1" });
    expect("siteId" in input).toBe(false);
    expect("folderId" in input).toBe(false);
    expect("description" in input).toBe(false);
  });

  it("dolu alanlar kırpılarak taşınır", () => {
    const input = buildArchiveDocumentInput(
      { ...base, siteId: "s1", folderId: "f1", description: "  Ruhsat  " },
      FILE,
    );
    expect(input).toEqual({
      file: FILE,
      projectId: "p1",
      siteId: "s1",
      folderId: "f1",
      description: "Ruhsat",
    });
  });

  it("🔴 devre-dışı 'Belge Adı' (121-125) gövdeye GİRMEZ", () => {
    expect(Object.keys(buildArchiveDocumentInput(base, FILE))).not.toContain("filename");
  });
});
