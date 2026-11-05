import { useEffect, useState } from "react";
import { Logo } from "./Logo";

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
        <Logo className="launch-intro__logo" />
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
