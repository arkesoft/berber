import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SlotPicker } from "../app/shared/SlotPicker";
import { availability } from "../app/contracts/schemas";
const slot = {
  id: "one|2026-10-27T06:00:00Z",
  staffId: "one",
  startsAt: "2026-10-27T06:00:00Z",
  endsAt: "2026-10-27T06:30:00Z",
};
it("keeps a fully occupied day visible and never calls selection for disabled slots", async () => {
  const onChange = vi.fn();
  render(
    <SlotPicker
      name="slot"
      value=""
      onChange={onChange}
      legend="Saat seçin"
      data={availability.parse({
        slots: [],
        unavailableSlots: [{ ...slot, status: "busy" }],
        timezone: "Europe/Istanbul",
        fetchedAt: "2026-10-26T06:00:00Z",
      })}
    />,
  );
  const busy = screen.getByRole("radio", { name: "09:00 Dolu" });
  expect(busy).toBeDisabled();
  await userEvent.click(screen.getByText("09:00"));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "seçilebilir saat kalmadı",
  );
  expect(
    screen.queryByText(/çalışma saatleri bulunmuyor/),
  ).not.toBeInTheDocument();
});
it("an available selection becomes unchecked and disabled when a refresh marks it busy", () => {
  const props = {
    name: "slot",
    value: slot.id,
    onChange: vi.fn(),
    legend: "Saat seçin",
  };
  const data = {
    timezone: "Europe/Istanbul",
    fetchedAt: "2026-10-26T06:00:00Z",
  };
  const { rerender } = render(
    <SlotPicker
      {...props}
      data={availability.parse({ ...data, slots: [slot] })}
    />,
  );
  expect(screen.getByRole("radio", { name: "09:00 Seçildi" })).toBeChecked();
  rerender(
    <SlotPicker
      {...props}
      data={availability.parse({
        ...data,
        slots: [],
        unavailableSlots: [{ ...slot, status: "busy" }],
      })}
    />,
  );
  expect(screen.getByRole("radio", { name: "09:00 Dolu" })).toBeDisabled();
  expect(screen.getByRole("radio")).not.toBeChecked();
});
