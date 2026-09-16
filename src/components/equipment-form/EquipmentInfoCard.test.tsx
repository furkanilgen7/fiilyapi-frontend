import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { EquipmentInfoCard } from "./EquipmentInfoCard";
import { emptyEquipmentFormValues } from "./form-state";
import { MESSAGES } from "./validate";

describe("EquipmentInfoCard — Model Yılı hata gösterimi", () => {
  it("🔴 errors.modelYear doluysa alan hatalı işaretlenir ve mesaj görünür", () => {
    render(
      <EquipmentInfoCard
        values={{ ...emptyEquipmentFormValues(), modelYear: "20222" }}
        onChange={vi.fn()}
        errors={{ modelYear: MESSAGES.modelYearRange }}
      />,
    );

    const input = screen.getByPlaceholderText("2022");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(MESSAGES.modelYearRange)).toBeInTheDocument();
  });
});
