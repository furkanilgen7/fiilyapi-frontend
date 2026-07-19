import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "./QueryProvider";

describe("QueryProvider", () => {
  it("cocuklari render eder", () => {
    render(
      <QueryProvider>
        <span>icerik</span>
      </QueryProvider>,
    );
    expect(screen.getByText("icerik")).toBeInTheDocument();
  });
});
