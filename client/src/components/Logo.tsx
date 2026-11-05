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
        // Fallback to high-res original raster if SVG fails
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
      aria-label="Gastador — Snap it. Track it. Stretch it."
    >
      <LogoMark size={36} />
      <span className="brand-lockup__name">Gastador</span>
    </span>
  );
}
