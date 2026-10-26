import { Link } from "react-router";
import { t } from "../../shared/i18n";
import { publicSalon } from "../../config/salon";
import { landingPhotos } from "../../config/landing";
import { formatMoney } from "../../shared/format";
import { QueryState } from "../../shared/ui";
import { useCatalog } from "./api";
import { PhotoReel } from "./PhotoReel";
import "./landing.css";

const servicePhotos = ["haircut", "cut", "detail"] as const;
const questions = [
  ["landing.faq1", "landing.answer1"],
  ["landing.faq2", "landing.answer2"],
  ["landing.faq3", "landing.answer3"],
  ["landing.faq4", "landing.answer4"],
] as const;

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomePage() {
  const query = useCatalog();
  const salon = query.data?.salon ?? publicSalon;
  return (
    <div className="salon-landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy landing-container">
          <h1 id="landing-title" className="landing-headline" tabIndex={-1}>
            <span>{t("landing.headlineFirst")}</span>{" "}
            <span>{t("landing.headlineSecond")}</span>
          </h1>
          <p>{t("landing.intro")}</p>
          <div className="landing-hero-actions">
            <Link className="landing-button" to="/randevu">
              {t("landing.book")}
              <Arrow />
            </Link>
            <a className="landing-text-link" href="#hizmetler">
              {t("landing.discover")}
            </a>
          </div>
        </div>
        <PhotoReel />
      </section>
      <section
        className="landing-about landing-section landing-container"
        aria-labelledby="about-title"
      >
        <div className="landing-about-photo landing-image-frame">
          <img
            src={landingPhotos.chair.src}
            width={1100}
            height={733}
            alt={t("landing.chairAlt")}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="landing-about-copy">
          <h2 id="about-title">{t("landing.aboutTitle")}</h2>
          <p className="landing-lead">{salon.description}</p>
          <p>{t("landing.aboutCopy")}</p>
          <a className="landing-text-link" href="#hizmetler">
            {t("landing.aboutLink")}
            <Arrow />
          </a>
        </div>
      </section>
      <section
        id="hizmetler"
        className="landing-services landing-section landing-container"
        aria-labelledby="services-title"
      >
        <div className="landing-section-heading">
          <h2 id="services-title">{t("landing.serviceTitle")}</h2>
          <p>{t("landing.serviceIntro")}</p>
        </div>
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        >
          {query.data?.services.length === 0 && <p>{t("copy.78ecb43000")}</p>}
          <div className="landing-service-list">
            {query.data?.services.map((service, index) => {
              const photo =
                landingPhotos[
                  servicePhotos[index % servicePhotos.length] ?? "haircut"
                ];
              return (
                <Link
                  className="landing-service"
                  key={service.id}
                  to={`/randevu?hizmet=${encodeURIComponent(service.id)}`}
                >
                  <div className="landing-service-photo landing-image-frame">
                    <img
                      src={photo.src}
                      width={photo.width}
                      height={photo.height}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="landing-service-invite">
                      {t("landing.selectService")}
                      <Arrow />
                    </span>
                  </div>
                  <div className="landing-service-info">
                    <div>
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                    </div>
                    <div className="landing-service-price">
                      <strong>{formatMoney(service.price)}</strong>
                      <span>
                        {t("landing.minutes", {
                          minutes: service.durationMinutes,
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </QueryState>
      </section>
      <section
        id="berberler"
        className="landing-team"
        aria-labelledby="team-title"
      >
        <div className="landing-team-layout landing-container">
          <div className="landing-team-copy">
            <h2 id="team-title">{t("landing.teamTitle")}</h2>
            <p>{t("landing.teamIntro")}</p>
            <QueryState
              pending={query.isPending}
              error={query.error}
              retry={() => void query.refetch()}
            >
              <div className="landing-team-list">
                {query.data?.staff.map((person) => (
                  <div className="landing-person" key={person.id}>
                    <h3>{person.name}</h3>
                    <p>{t("landing.teamRole")}</p>
                  </div>
                ))}
                {query.data?.staff.length === 0 && (
                  <p>{t("landing.teamEmpty")}</p>
                )}
              </div>
            </QueryState>
            <Link className="landing-button" to="/randevu">
              {t("landing.teamCta")}
              <Arrow />
            </Link>
          </div>
          <div className="landing-team-photo landing-image-frame">
            <img
              src={landingPhotos.tools.src}
              width={900}
              height={1350}
              alt={t("landing.toolsAlt")}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>
      <section
        className="landing-faq landing-section landing-container"
        aria-labelledby="faq-title"
      >
        <h2 id="faq-title">{t("landing.faqTitle")}</h2>
        <div>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {t(question)}
                <span aria-hidden="true" className="faq-toggle" />
              </summary>
              <p>{t(answer)}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        id="iletisim"
        className="landing-contact"
        aria-labelledby="contact-title"
      >
        <div className="landing-container">
          <div className="landing-contact-top">
            <h2 id="contact-title">{t("landing.contactTitle")}</h2>
            <div>
              <p>{t("landing.contactIntro")}</p>
              <Link className="landing-button" to="/randevu">
                {t("landing.book")}
                <Arrow />
              </Link>
            </div>
          </div>
          <footer className="landing-footer">
            <div className="landing-footer-brand">
              <Link to="/">{salon.name}</Link>
              <p>{t("landing.demo")}</p>
            </div>
            <div>
              <h3>{t("landing.footerNav")}</h3>
              <a href="#hizmetler">{t("landing.services")}</a>
              <a href="#berberler">{t("landing.team")}</a>
              <Link to="/randevu">{t("landing.book")}</Link>
            </div>
            <div>
              <h3>{t("landing.location")}</h3>
              <p>{salon.address}</p>
            </div>
            <div>
              <h3>{t("landing.phone")}</h3>
              <a href={`tel:${salon.phone.replaceAll(" ", "")}`}>
                {salon.phone}
              </a>
            </div>
          </footer>
          <details className="landing-credits">
            <summary>{t("landing.photoCredits")}</summary>
            <p>{t("landing.stockCredits")}</p>
            <ul>
              {Object.values(landingPhotos).map((photo) => (
                <li key={photo.src}>
                  <a href={photo.source} target="_blank" rel="noreferrer">
                    {photo.credit}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>
    </div>
  );
}
