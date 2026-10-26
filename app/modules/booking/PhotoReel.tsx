import { useState } from "react";
import { landingPhotos } from "../../config/landing";
import { t } from "../../shared/i18n";

const frames = [
  ["haircut", "landing.haircutAlt"],
  ["cut", "landing.heroAlt"],
  ["chair", "landing.chairAlt"],
  ["detail", "landing.detailAlt"],
] as const;

// UI-only animation. The inaccessible duplicate makes the loop seamless.
export function PhotoReel() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="landing-reel" data-paused={paused}>
      <div
        className="landing-reel-window"
        role="group"
        tabIndex={0}
        aria-label={t("landing.reelLabel")}
      >
        <div className="landing-reel-track">
          {[false, true].map((duplicate) => (
            <div
              className="landing-reel-group"
              aria-hidden={duplicate || undefined}
              key={String(duplicate)}
            >
              {frames.map(([key, alt], index) => {
                const photo = landingPhotos[key];
                return (
                  <div
                    className={`landing-reel-photo landing-reel-photo-${key}`}
                    key={key}
                  >
                    <img
                      src={photo.src}
                      width={photo.width}
                      height={photo.height}
                      alt={duplicate ? "" : t(alt)}
                      fetchPriority={
                        !duplicate && index === 0 ? "high" : "auto"
                      }
                      decoding="async"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="landing-reel-caption landing-container">
        <p>{t("landing.reelNote")}</p>
        <button
          type="button"
          className="landing-motion-toggle"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
          {t(paused ? "landing.play" : "landing.pause")}
        </button>
      </div>
    </div>
  );
}
