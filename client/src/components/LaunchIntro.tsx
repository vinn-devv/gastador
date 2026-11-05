import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const DotLottiePlayer: any = "dotlottie-wc";
const LOTTIE_SOURCE =
  "https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie";

export function LaunchIntro() {
  const [mounted, setMounted] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Play once per document launch. This component is rendered outside
    // BrowserRouter, so route changes never restart the intro.
    const timer = window.setTimeout(
      () => setClosing(true),
      reducedMotion ? 2800 : 6200,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setMounted(false), 560);
    return () => window.clearTimeout(timer);
  }, [closing]);

  if (!mounted) return null;

  const dismiss = () => setClosing(true);

  // Portal to body so the launch layer is never trapped by the app shell,
  // route transitions, or #root stacking context.
  return createPortal(
    <div
      className={`launch-intro${closing ? " launch-intro--exit" : ""}`}
      role="status"
      aria-label="Opening Gastador"
      aria-live="polite"
    >
      <div className="launch-intro__glow" aria-hidden="true" />
      <div className="launch-intro__ambient launch-intro__ambient--one" aria-hidden="true" />
      <div className="launch-intro__ambient launch-intro__ambient--two" aria-hidden="true" />

      <div className="launch-intro__content">
        <div className="launch-intro__stage" aria-hidden="true">
          <div className="launch-intro__halo launch-intro__halo--outer" />
          <div className="launch-intro__halo launch-intro__halo--inner" />

          <div className="launch-intro__lottie-wrap">
            <DotLottiePlayer
              src={LOTTIE_SOURCE}
              autoplay
              loop
              speed={0.82}
              className="launch-intro__lottie-player"
            />
          </div>

          <span className="launch-intro__coin launch-intro__coin--one">₱</span>
          <span className="launch-intro__coin launch-intro__coin--two">₱</span>
          <span className="launch-intro__coin launch-intro__coin--three">₱</span>

          <div className="launch-intro__mark">
            <span className="launch-intro__corner launch-intro__corner--tl" />
            <span className="launch-intro__corner launch-intro__corner--tr" />
            <span className="launch-intro__corner launch-intro__corner--bl" />
            <span className="launch-intro__corner launch-intro__corner--br" />
            <span className="launch-intro__scan-line" />
            <img
              src={`${import.meta.env.BASE_URL}gastador-mark.svg`}
              alt=""
              draggable={false}
            />
          </div>
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
    </div>,
    document.body,
  );
}
