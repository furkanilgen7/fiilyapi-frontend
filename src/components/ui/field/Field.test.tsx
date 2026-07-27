import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Field } from "./Field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

describe("Field", () => {
  it("etiketi kontrole otomatik baglar (tuketen ekran id uydurmaz)", () => {
    render(
      <Field label="Ad Soyad">{(control) => <Input {...control} defaultValue="Ali" />}</Field>,
    );
    const control = screen.getByLabelText("Ad Soyad");
    expect(control).toHaveValue("Ali");
    expect(control.id).toBeTruthy();
  });

  it("ayni sayfadaki iki alan icin cakismayan id uretir", () => {
    render(
      <>
        <Field label="Kod">{(control) => <Input {...control} />}</Field>
        <Field label="Ad">{(control) => <Input {...control} />}</Field>
      </>,
    );
    expect(screen.getByLabelText("Kod").id).not.toBe(screen.getByLabelText("Ad").id);
  });

  it("Select gibi diger kontrollerle de calisir", () => {
    render(
      <Field label="Tip">
        {(control) => (
          <Select {...control} defaultValue="a">
            <option value="a">A</option>
          </Select>
        )}
      </Field>,
    );
    expect(screen.getByLabelText("Tip").tagName).toBe("SELECT");
  });

  it("zorunlu alanda yildiz gosterir ve kontrole aria-required verir", () => {
    render(<Field label="Kod" required>{(control) => <Input {...control} />}</Field>);
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByLabelText("Kod")).toHaveAttribute("aria-required", "true");
  });

  it("yildiz erisilebilir isme sizmaz (etiket metni temiz kalir)", () => {
    render(<Field label="Kod" required>{(control) => <Input {...control} />}</Field>);
    // Yildiz <label> disinda ve aria-hidden; getByLabelText("Kod") calismali.
    expect(screen.getByLabelText("Kod")).toBeInTheDocument();
  });

  it("zorunlu degilse yildiz ve aria-required yok", () => {
    render(<Field label="Kod">{(control) => <Input {...control} />}</Field>);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Kod")).not.toHaveAttribute("aria-required");
  });

  it("ipucunu aria-describedby ile kontrole baglar", () => {
    render(
      <Field label="Kod" hint="Bos birakilirsa otomatik">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const control = screen.getByLabelText("Kod");
    const hint = screen.getByText("Bos birakilirsa otomatik");
    expect(control.getAttribute("aria-describedby")).toBe(hint.id);
    expect(hint.id).toBeTruthy();
  });

  it("hata durumunda aria-invalid verir ve hatayi describedby'a ekler", () => {
    render(
      <Field label="Kod" error="Kod zorunludur.">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const control = screen.getByLabelText("Kod");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control.getAttribute("aria-describedby")).toBe(
      screen.getByText("Kod zorunludur.").id,
    );
  });

  it("ipucu ve hata birlikteyken describedby ikisini de gosterir", () => {
    render(
      <Field label="Kod" hint="Ipucu metni" error="Hata metni">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const control = screen.getByLabelText("Kod");
    const ids = (control.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toContain(screen.getByText("Ipucu metni").id);
    expect(ids).toContain(screen.getByText("Hata metni").id);
    expect(ids).toHaveLength(2);
  });

  it("ipucu/hata yokken describedby hic basilmaz", () => {
    render(<Field label="Kod">{(control) => <Input {...control} />}</Field>);
    expect(screen.getByLabelText("Kod")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText("Kod")).not.toHaveAttribute("aria-invalid");
  });

  it("etiket satirinin sagina yardimci icerik koyabilir", () => {
    render(
      <Field label="Sifre" labelAside={<span>Sifremi unuttum</span>}>
        {(control) => <Input {...control} type="password" />}
      </Field>,
    );
    expect(screen.getByLabelText("Sifre")).toBeInTheDocument();
    expect(screen.getByText("Sifremi unuttum")).toBeInTheDocument();
  });

  it("olcu varyantini ve dis sinifi koke uygular", () => {
    const { container } = render(
      <Field label="Kod" size="lg" className="login-field">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const root = container.querySelector(".field");
    expect(root).toHaveClass("field--lg");
    expect(root).toHaveClass("login-field");
  });
});
