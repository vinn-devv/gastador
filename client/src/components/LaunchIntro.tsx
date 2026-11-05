import { useEffect, useState } from "react";

export function LaunchIntro() {
  const [mounted, setMounted] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => setClosing(true),
      reducedMotion ? 1600 : 2800,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setMounted(false), 420);
    return () => window.clearTimeout(timer);
  }, [closing]);

  if (!mounted) return null;

  const dismiss = () => setClosing(true);

  return (
    <div
      className={`launch-intro${closing ? " launch-intro--exit" : ""}`}
      role="status"
      aria-label="Opening Gastador"
    >
      <div className="launch-intro__glow" aria-hidden="true" />
      <div className="launch-intro__content">
        <div className="launch-intro__mark" aria-hidden="true">
          <span className="launch-intro__corner launch-intro__corner--tl" />
          <span className="launch-intro__corner launch-intro__corner--tr" />
          <span className="launch-intro__corner launch-intro__corner--bl" />
          <span className="launch-intro__corner launch-intro__corner--br" />
          <img src={`${import.meta.env.BASE_URL}gastador-mark.svg`} alt="" draggable={false} />
        </div>
        <div className="launch-intro__wordmark" aria-hidden="true">
          <span>Gastador</span>
        </div>
        <p className="launch-intro__tagline">Snap it. Track it. Stretch it.</p>
      </div>
      <button
        type="button"
        className="launch-intro__skip"
        onClick={dismiss}
        aria-label="Skip intro"
      >
        Skip
      </button>
    </div>
  );
}
