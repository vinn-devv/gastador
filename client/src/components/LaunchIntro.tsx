import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const INTRO_DURATION_MS = 6500;
const EXIT_DURATION_MS = 450;

export function LaunchIntro() {
  const [mounted, setMounted] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setClosing(true), INTRO_DURATION_MS);
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
      className={"launch-intro" + (closing ? " launch-intro--exit" : "")}
      role="status"
      aria-label="Opening Gastador"
      aria-live="polite"
    >
      <div className="launch-intro__content">
        <div className="launch-intro__icon-stage" aria-hidden="true">
          <img
            className="launch-intro__icon"
            src={import.meta.env.BASE_URL + "gastador-intro-mark.svg"}
            alt=""
            draggable={false}
          />
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
