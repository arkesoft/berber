import { t } from "./shared/i18n";
import { useEffect, useState, type ReactNode } from "react";
import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
  Link,
} from "react-router";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { useSession } from "./modules/identity";
import { session, catalog } from "./contracts/schemas";
import { mockMode, request, resetTokens, ApiError } from "./shared/api/http";
import { Button } from "./shared/ui";
import { publicSalon } from "./config/salon";
import "@fontsource-variable/outfit";
import "./styles.css";
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
export default function App() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              count < 1 &&
              (!(error instanceof ApiError) || error.status >= 500),
            staleTime: 30000,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Shell />
    </QueryClientProvider>
  );
}
function Shell() {
  const publicQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: ({ signal }) => request("/catalog", catalog, { signal }),
  });
  const salon = publicQuery.data?.salon ?? publicSalon;
  const auth = useSession(),
    cache = useQueryClient(),
    navigate = useNavigate(),
    location = useLocation();
  const [theme, setTheme] = useState("light"),
    [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setTheme("dark");
      document.documentElement.dataset.theme = "dark";
    }
  }, []);
  useEffect(() => {
    // ScrollRestoration handles section links; focusing h1 here would undo it.
    if (location.hash) return;
    document.querySelector<HTMLHeadingElement>("main h1")?.focus();
  }, [location.pathname, location.hash]);
  const role = auth.data?.user?.role;
  const isLanding = location.pathname === "/";
  const isOperations = /^\/(yonetim|calisan)(\/|$)/.test(location.pathname);
  async function logout() {
    try {
      await request("/session", session, { method: "DELETE" });
      await cache.cancelQueries();
      cache.clear();
      resetTokens();
      await navigate("/");
    } catch {
      setLogoutError(t("copy.29de417807"));
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        {t("copy.1d1efc464b")}
      </a>
      <div className={`app-frame${isLanding ? " landing-frame" : ""}`}>
        <header className="site-header">
          <Link className="brand" to="/">
            <span>{salon.name}</span>
          </Link>
          <nav aria-label={t("copy.41b724f3cb")}>
            {!isOperations ? (
              <>
                <Link to="/#hizmetler">{t("landing.services")}</Link>
                <Link to="/#berberler">{t("landing.team")}</Link>
                <Link to="/#iletisim">{t("landing.contact")}</Link>
              </>
            ) : (
              <NavLink to="/" end>
                {t("copy.4e353fada1")}
              </NavLink>
            )}
            <NavLink to="/randevu">{t("copy.f08cd23e06")}</NavLink>
            {role === "customer" && (
              <NavLink to="/randevularim">{t("copy.fe1e63ffb9")}</NavLink>
            )}
            {role === "manager" && (
              <NavLink to="/yonetim">{t("copy.74e4fa5abf")}</NavLink>
            )}
            {role === "staff" && (
              <NavLink to="/calisan">{t("copy.9637b42e02")}</NavLink>
            )}
          </nav>
          <div className="header-actions">
            <Button
              variant="quiet"
              aria-label={
                theme === "light" ? t("copy.0f66572e6d") : t("copy.7f67fdef00")
              }
              onClick={() => {
                const next = theme === "light" ? "dark" : "light";
                setTheme(next);
                document.documentElement.dataset.theme = next;
                localStorage.setItem("theme", next);
              }}
            >
              {theme === "light" ? t("copy.0f66572e6d") : t("copy.7f67fdef00")}
            </Button>
            {auth.data?.user ? (
              <Button variant="quiet" onClick={() => void logout()}>
                {t("copy.ea5b69c1ad")}
              </Button>
            ) : (
              <NavLink to="/giris">{t("copy.b872b116e8")}</NavLink>
            )}
          </div>
        </header>
        {logoutError && <p role="alert">{logoutError}</p>}
        <main
          id="main"
          className={
            isLanding
              ? "landing-main"
              : `workspace${isOperations ? " workspace-operations" : ""}`
          }
        >
          <Outlet />
        </main>
        {mockMode && <DemoTools />}
        {!isLanding && (
          <footer className="site-footer">
            <div>
              <Link className="brand" to="/">
                {salon.name}
              </Link>
              <p>{t("copy.d882c8c033")}</p>
            </div>
            <div>
              <h2>{t("landing.location")}</h2>
              <p>{salon.address}</p>
            </div>
            <div>
              <h2>{t("landing.phone")}</h2>
              <a href={`tel:${salon.phone.replaceAll(" ", "")}`}>
                {salon.phone}
              </a>
              <Link to="/">{t("copy.6d685d12cb")}</Link>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
function DemoTools() {
  const cache = useQueryClient();
  const [scenario, setScenario] = useState("success");
  useEffect(
    () => setScenario(sessionStorage.getItem("mock-scenario") ?? "success"),
    [],
  );
  return (
    <details className="demo-bar">
      <summary>{t("copy.dc7bec1ec9")}</summary>
      <label htmlFor="scenario">{t("copy.47b0828841")}</label>
      <select
        id="scenario"
        value={scenario}
        onChange={(event) => {
          setScenario(event.target.value);
          sessionStorage.setItem("mock-scenario", event.target.value);
          void cache.invalidateQueries({
            predicate: (query) => query.queryKey[0] !== "session",
          });
        }}
      >
        <option value="success">{t("copy.59c1c2fcfd")}</option>
        <option value="slow">{t("copy.49320430db")}</option>
        <option value="empty">{t("copy.81856c1cdf")}</option>
        <option value="network-error">{t("copy.ece03dceab")}</option>
        <option value="response-lost">{t("demo.responseLost")}</option>
        <option value="server-error">{t("copy.025f71e3c2")}</option>
        <option value="unauthorized">{t("copy.e09b65d137")}</option>
        <option value="conflict">{t("copy.f56e5f1264")}</option>
        <option value="payment-failed">{t("copy.dd19634863")}</option>
        <option value="expired">{t("copy.bb5ef916e1")}</option>
      </select>
      <p>{t("copy.8ca424396c")}</p>
    </details>
  );
}
export function HydrateFallback() {
  return (
    <main className="system-page">
      <h1>{publicSalon.name}</h1>
      <p role="status">{t("copy.a0e6b57ead")}</p>
    </main>
  );
}
export function ErrorBoundary() {
  return (
    <main className="system-page">
      <h1>{t("copy.a8c89d9c9e")}</h1>
      <p>{t("copy.5bf14cfc17")}</p>
      <a className="button primary" href="/">
        {t("copy.6d685d12cb")}
      </a>
    </main>
  );
}
