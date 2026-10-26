import { t } from "./shared/i18n";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
async function bootstrap() {
  if (import.meta.env.VITE_API_MODE === "mock") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  } else if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (registration.active?.scriptURL.endsWith("/mockServiceWorker.js"))
        await registration.unregister();
    }
  }
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
}
void bootstrap().catch(() => {
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.textContent = t("copy.5a3168c0e8");
  document.body.append(message);
});
