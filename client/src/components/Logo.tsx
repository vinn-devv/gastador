interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}gastador-mark.svg`}
      width={size}
      height={size}
      className={`brand-mark ${className}`}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.endsWith("icon-512.png")) {
          target.src = `${import.meta.env.BASE_URL}icon-512.png`;
        }
      }}
    />
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`brand-lockup ${className}`}
      role="img"
      aria-label="Gastador — Snap it. Track it. Stretch it."
    >
      <img
        src={`${import.meta.env.BASE_URL}gastador-logo.webp`}
        className="brand-lockup__image brand-lockup__image--light"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <img
        src={`${import.meta.env.BASE_URL}gastador-logo-dark.webp`}
        className="brand-lockup__image brand-lockup__image--dark"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </span>
  );
}
