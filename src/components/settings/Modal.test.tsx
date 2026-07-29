import { useState } from "react";
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

// A11Y BULGUSU: diyalog `aria-modal` tasiyordu ama odak yonetimi yoktu —
// klavye kullanicisi acilista sayfada kaliyor ve Tab ile gorsel olarak
// ortulmus icerige cikabiliyordu. Tuzak paylasilan primitive'de kuruldu.
describe("Modal — odak yonetimi", () => {
  function renderModal(onClose = () => {}) {
    return render(
      <Modal title="Test" onClose={onClose} footer={<button type="button">Kaydet</button>}>
        <button type="button">Ilk</button>
        <button type="button">Ikinci</button>
      </Modal>,
    );
  }

  it("acilista odak diyalogun ilk odaklanabilir ogesine tasinir", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "Kapat" })).toHaveFocus();
  });

  it("odaklanabilir ogesi olmayan diyalogda odak kabin uzerine tasinir", () => {
    render(
      <Modal title="Bos" onClose={() => {}}>
        <span>govde</span>
      </Modal>,
    );
    // Kapat butonu her zaman var; onu gizleyerek "hic odaklanabilir yok"
    // durumunu kurmak yerine dogrudan kabin odaklanabilirligini dogrula.
    expect(screen.getByRole("dialog", { name: "Bos" })).toHaveAttribute("tabindex", "-1");
  });

  it("Tab son odaklanabilir ogeden ilkine sarar", async () => {
    const user = userEvent.setup();
    renderModal();
    const kapat = screen.getByRole("button", { name: "Kapat" });
    const kaydet = screen.getByRole("button", { name: "Kaydet" });

    kaydet.focus();
    expect(kaydet).toHaveFocus();
    await user.tab();
    expect(kapat).toHaveFocus();
  });

  it("Shift+Tab ilk ogeden sonuncuya geri sarar", async () => {
    const user = userEvent.setup();
    renderModal();
    const kapat = screen.getByRole("button", { name: "Kapat" });
    const kaydet = screen.getByRole("button", { name: "Kaydet" });

    expect(kapat).toHaveFocus();
    await user.tab({ shift: true });
    expect(kaydet).toHaveFocus();
  });

  it("Tab diyalog icinde sirayla ilerler, disari cikmaz", async () => {
    const user = userEvent.setup();
    renderModal();
    const order = [
      screen.getByRole("button", { name: "Kapat" }),
      screen.getByRole("button", { name: "Ilk" }),
      screen.getByRole("button", { name: "Ikinci" }),
      screen.getByRole("button", { name: "Kaydet" }),
    ];
    expect(order[0]).toHaveFocus();
    for (let index = 1; index < order.length; index += 1) {
      await user.tab();
      expect(order[index]).toHaveFocus();
    }
    await user.tab();
    expect(order[0]).toHaveFocus();
  });

  it("kapanista odak modali acan ogeye geri doner", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Ac
          </button>
          {open && (
            <Modal title="Test" onClose={() => setOpen(false)}>
              <span>govde</span>
            </Modal>
          )}
        </>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Ac" });
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Kapat" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
