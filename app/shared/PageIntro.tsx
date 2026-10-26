import type { ReactNode } from "react";

/** Shared presentation for customer journeys; no domain or request state. */
export function PageIntro({
  title,
  description,
  image,
  children,
}: {
  title: string;
  description: string;
  image: { src: string; width: number; height: number };
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <div className="page-intro-copy">
        <h1 tabIndex={-1}>{title}</h1>
        <p>{description}</p>
        {children && <div className="page-intro-action">{children}</div>}
      </div>
      <div className="page-intro-photo" aria-hidden="true">
        <img
          src={image.src}
          width={image.width}
          height={image.height}
          alt=""
          decoding="async"
        />
      </div>
    </header>
  );
}
