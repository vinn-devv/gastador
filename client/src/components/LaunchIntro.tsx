import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const DotLottiePlayer: any = "dotlottie-wc";
const SCENE_DURATION_MS = 5000;

export function LaunchIntro() {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(false), SCENE_DURATION_MS + 120);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="launch-intro launch-intro--video-only"
      role="status"
      aria-label="Opening Gastador"
      aria-live="polite"
    >
      <DotLottiePlayer
        src={import.meta.env.BASE_URL + "gastador-intro.json"}
        autoplay
        speed={1}
        mode="forward"
        loop={false}
        className="launch-intro__player launch-intro__video-only-player"
        aria-hidden="true"
      />
    </div>,
    document.body,
  );
}
