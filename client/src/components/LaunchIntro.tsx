import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const INTRO_EXIT_MS = 420;
const INTRO_DURATION_MS = 3600;

export function LaunchIntro() {
  const [mounted, setMounted] = useState(true);
  const [exiting, setExiting] = useState(false);
  const removeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false;
    const duration = reducedMotion ? 1100 : INTRO_DURATION_MS;

    const exitTimer = window.setTimeout(() => setExiting(true), duration);
    removeTimer.current = window.setTimeout(
      () => setMounted(false),
      duration + INTRO_EXIT_MS,
    );

    return () => {
      window.clearTimeout(exitTimer);
      if (removeTimer.current !== undefined) {
        window.clearTimeout(removeTimer.current);
      }
    };
  }, []);

  function skipIntro() {
    if (exiting) return;
    setExiting(true);
    if (removeTimer.current !== undefined) {
      window.clearTimeout(removeTimer.current);
    }
    removeTimer.current = window.setTimeout(
      () => setMounted(false),
      INTRO_EXIT_MS,
    );
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`launch-intro${exiting ? " launch-intro--exit" : ""}`}
      role="status"
      aria-label="Opening Gastador App"
      aria-live="polite"
    >
      <div className="launch-intro__glow" aria-hidden="true" />
      <div
        className="launch-intro__ambient launch-intro__ambient--one"
        aria-hidden="true"
      />
      <div
        className="launch-intro__ambient launch-intro__ambient--two"
        aria-hidden="true"
      />

      <div className="launch-intro__content">
        <div className="launch-intro__stage" aria-hidden="true">
          <span className="launch-intro__halo" />
          <span className="launch-intro__halo launch-intro__halo--inner" />
          <div className="launch-intro__mark">
            <img
              src={`${import.meta.env.BASE_URL}gastador-intro-mark.svg?v=2`}
              alt=""
              draggable={false}
            />
          </div>
        </div>

        <div className="launch-intro__copy">
          <div className="launch-intro__wordmark" aria-label="Gastador App">
            <span className="launch-intro__wordmark-main">Gastador</span>
            <span className="launch-intro__wordmark-suffix"> App</span>
          </div>
        </div>
        <p className="launch-intro__tagline">
          SNAP IT <span aria-hidden="true">·</span> TRACK IT{" "}
          <span aria-hidden="true">·</span> STRETCH IT
        </p>
      </div>

      <button
        type="button"
        className="launch-intro__skip"
        onClick={skipIntro}
        disabled={exiting}
      >
        Skip intro
      </button>
    </div>,
    document.body,
  );
}
