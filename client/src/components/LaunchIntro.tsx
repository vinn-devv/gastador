import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const INTRO_DURATION_MS = 6400;
const EXIT_DURATION_MS = 450;

export function LaunchIntro() {
  const [mounted, setMounted] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => setClosing(true),
      reducedMotion ? 5400 : INTRO_DURATION_MS,
    );

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  if (!mounted) return null;

  const dismiss = () => setClosing(true);

  return createPortal(
    <div
      className={`launch-intro${closing ? " launch-intro--exit" : ""}`}
      role="status"
      aria-label="Opening Gastador"
      aria-live="polite"
    >
      <div className="launch-intro__content">
        <div className="launch-intro__stage" aria-hidden="true">
          <div className="launch-intro__mark">
            <span className="launch-intro__corner launch-intro__corner--tl" />
            <span className="launch-intro__corner launch-intro__corner--tr" />
            <span className="launch-intro__corner launch-intro__corner--bl" />
            <span className="launch-intro__corner launch-intro__corner--br" />
            <img
              src={`${import.meta.env.BASE_URL}gastador-mark.svg`}
              alt=""
              draggable={false}
            />
          </div>
        </div>

        <div className="launch-intro__copy" aria-hidden="true">
          <div className="launch-intro__wordmark">Gastador</div>
          <p className="launch-intro__tagline">Snap it. Track it. Stretch it.</p>
        </div>
      </div>

      <button
        type="button"
        className="launch-intro__skip"
        onClick={dismiss}
        aria-label="Skip intro"
      >
        Skip
      </button>
    </div>,
    document.body,
  );
}
