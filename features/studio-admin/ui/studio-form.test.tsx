import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { COUNTRIES } from "@/shared/config/countries";
import messages from "@/messages/en.json";
import { StudioForm } from "./studio-form";

const TIMEZONES = ["UTC", "Europe/Minsk", "Europe/Warsaw", "America/New_York"];

function renderForm(submit = vi.fn().mockResolvedValue({ ok: true })) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <StudioForm
        initial={DEFAULT_SITE_SETTINGS}
        countries={COUNTRIES}
        timeZones={TIMEZONES}
        onSubmit={submit}
      />
    </NextIntlClientProvider>,
  );
  return { submit };
}

describe("StudioForm", () => {
  it("renders the three address inputs and three city inputs", () => {
    renderForm();
    expect(screen.getByLabelText(/address.*english/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address.*russian/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address.*belarusian/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city.*english/i)).toBeInTheDocument();
  });

  it("disables the 'Show map' checkbox when latitude or longitude is empty", () => {
    renderForm();
    const checkbox = screen.getByRole("checkbox", { name: /show map/i });
    expect(checkbox).toBeDisabled();
  });

  it("enables the 'Show map' checkbox once both coords are filled", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/latitude/i), {
      target: { value: "54.231" },
    });
    fireEvent.change(screen.getByLabelText(/longitude/i), {
      target: { value: "28.491" },
    });
    expect(screen.getByRole("checkbox", { name: /show map/i })).not.toBeDisabled();
  });

  it("submits the patch shape and shows 'Saved' on success", async () => {
    const { submit } = renderForm();
    fireEvent.change(screen.getByLabelText(/city.*english/i), {
      target: { value: "Borisov" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledOnce();
    });
    const patch = submit.mock.calls[0][0];
    expect(patch.cityEn).toBe("Borisov");
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("displays the server error message on failure", async () => {
    renderForm(vi.fn().mockResolvedValue({ ok: false, error: "boom" }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
  });

  it("includes telegramUsername in the submitted patch", async () => {
    const { submit } = renderForm();
    fireEvent.change(screen.getByLabelText(/telegram username/i), {
      target: { value: "violetta_studio" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0][0].telegramUsername).toBe("violetta_studio");
  });

  it("warns via window.confirm when timezone is changed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm();
    const select = screen.getByLabelText(/timezone/i);
    fireEvent.change(select, { target: { value: "America/New_York" } });
    expect(confirmSpy).toHaveBeenCalled();
    // confirm returned false → value should NOT have changed
    expect(select).toHaveValue("Europe/Minsk");
    confirmSpy.mockRestore();
  });
});
