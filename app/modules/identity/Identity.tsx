import { t } from "../../shared/i18n";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { login, register, session } from "../../contracts/schemas";
import { mockMode, request, setSessionTokens } from "../../shared/api/http";
import { Button, Field, Notice } from "../../shared/ui";
import { landingPhotos } from "../../config/landing";
export function IdentityPage() {
  const [signup, setSignup] = useState(false);
  return (
    <div className="identity-layout">
      <aside className="identity-story" aria-label={t("identity.storyLabel")}>
        <div>
          <h2>{t("identity.storyTitle")}</h2>
          <p>{t("identity.storyCopy")}</p>
        </div>
        <img
          src={landingPhotos.haircut.src}
          width={landingPhotos.haircut.width}
          height={landingPhotos.haircut.height}
          alt=""
          decoding="async"
        />
      </aside>
      <section className="auth-page">
        <header className="auth-heading">
          <h1 tabIndex={-1}>
            {signup ? t("copy.66630ba6a7") : t("copy.9bbdbd4534")}
          </h1>
          <p className="muted">{t("copy.f8113573cf")}</p>
        </header>
        <IdentityForm key={String(signup)} signup={signup} />
        <Button variant="quiet" onClick={() => setSignup(!signup)}>
          {signup ? t("copy.eac8404fbf") : t("copy.cb34e4c16f")}
        </Button>
        <Link to="/randevu">{t("copy.c45f4bd7fb")}</Link>
      </section>
    </div>
  );
}
function IdentityForm({ signup }: { signup: boolean }) {
  const schema = signup
    ? register
    : login.extend({
        name: register.shape.name.optional(),
        phone: register.shape.phone.optional(),
      });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const navigate = useNavigate(),
    cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: Values) =>
      request(signup ? "/customers" : "/session", session, {
        method: "POST",
        body,
      }),
    onSuccess: async (result) => {
      await cache.cancelQueries();
      cache.clear();
      setSessionTokens(result.csrfToken);
      cache.setQueryData(["session"], result);
      await navigate(
        result.user?.role === "manager"
          ? "/yonetim"
          : result.user?.role === "staff"
            ? "/calisan"
            : "/randevularim",
      );
    },
  });
  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="stack"
    >
      {signup && (
        <Field
          label={t("copy.ad0fcbcc79")}
          autoComplete="name"
          {...form.register("name")}
          error={form.formState.errors.name?.message}
        />
      )}
      <Field
        label={t("copy.e1081b69d8")}
        type="email"
        autoComplete="email"
        {...form.register("email")}
        error={form.formState.errors.email?.message}
      />
      {signup && (
        <Field
          label={t("copy.fa6906d76e")}
          type="tel"
          autoComplete="tel"
          {...form.register("phone")}
          error={form.formState.errors.phone?.message}
        />
      )}
      <Field
        label={t("copy.e3962ceb93")}
        type="password"
        autoComplete={signup ? "new-password" : "current-password"}
        {...form.register("password")}
        error={form.formState.errors.password?.message}
      />
      {mutation.error && <Notice error>{mutation.error.message}</Notice>}
      <Button disabled={mutation.isPending}>
        {mutation.isPending
          ? t("copy.27cf2f182a")
          : signup
            ? t("copy.bc5c818f2f")
            : t("copy.b872b116e8")}
      </Button>
      {mockMode && (
        <details className="demo-accounts">
          <summary>{t("copy.f047e77b92")}</summary>
          <p>
            {t("copy.bf7660c4ce")}
            <strong>{"Demo12345!"}</strong>
          </p>
          <p>{t("demo.customer", { email: "musteri@example.test" })}</p>
          <p>{t("demo.manager", { email: "yonetici@example.test" })}</p>
          <p>{t("demo.staff", { email: "berber@example.test" })}</p>
          <p>{t("copy.4cbfb4d005")}</p>
        </details>
      )}
    </form>
  );
}
