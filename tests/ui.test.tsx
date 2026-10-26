import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Button, Field, QueryState } from "../app/shared/ui";
it("connects the visible label and error to the input", () => {
  render(<Field label="Ad soyad" name="name" error="Adınızı yazın." />);
  expect(
    screen.getByRole("textbox", { name: "Ad soyad" }),
  ).toHaveAccessibleDescription("Adınızı yazın.");
  expect(screen.getByRole("alert")).toBeVisible();
});
it("permits keyboard activation and disables pending actions", async () => {
  const click = vi.fn(),
    user = userEvent.setup();
  render(
    <>
      <Button onClick={click}>Kaydet</Button>
      <Button disabled>Bekleyin</Button>
    </>,
  );
  await user.tab();
  await user.keyboard("{Enter}");
  expect(click).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Bekleyin" })).toBeDisabled();
});
it("offers a retry after a failed query", async () => {
  const retry = vi.fn();
  render(
    <QueryState pending={false} error={new Error("Bağlantı yok")} retry={retry}>
      {null}
    </QueryState>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
  expect(retry).toHaveBeenCalledOnce();
});
