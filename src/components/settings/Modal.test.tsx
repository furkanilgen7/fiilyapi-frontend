import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("baslik + icerik render eder", () => {
    render(<Modal title="Test" onClose={() => {}}><span>govde</span></Modal>);
    expect(screen.getByRole("dialog", { name: "Test" })).toBeInTheDocument();
    expect(screen.getByText("govde")).toBeInTheDocument();
  });

  it("Kapat butonu onClose cagirir", async () => {
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}><span>govde</span></Modal>);
    await userEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape tusu onClose cagirir", async () => {
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}><span>govde</span></Modal>);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
