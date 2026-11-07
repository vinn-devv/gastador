import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DotLottieInstance = {
  duration?: number;
  addEventListener: (event: string, listener: () => void) => void;
  removeEventListener: (event: string, listener: () => void) => void;
};

type DotLottieElement = HTMLElement & {
  dotLottie?: DotLottieInstance;
};

const DotLottiePlayer: any = "dotlottie-wc";
const MAX_INTRO_MS = 8000;

export function LaunchIntro() {
  const [mounted, setMounted] = useState(true);
  const playerRef = useRef<DotLottieElement | null>(null);

  useEffect(() => {
    const player = playerRef.current;
    let finished = false;
    let hardStopTimer = 0;
    let completionTimer = 0;
    let errorTimer = 0;
    let pollTimer = 0;
    let attachedInstance: DotLottieInstance | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      setMounted(false);
    };

    const failGracefully = () => {
      if (finished || errorTimer) return;
      errorTimer = window.setTimeout(finish, 350);
    };

    const attachPlayerEvents = () => {
      if (finished || attachedInstance) return;
      const instance = player?.dotLottie;
      if (!instance) {
        pollTimer = window.setTimeout(attachPlayerEvents, 50);
        return;
      }

      attachedInstance = instance;
      instance.addEventListener("complete", finish);
      instance.addEventListener("loadError", failGracefully);
      instance.addEventListener("renderError", failGracefully);

      const duration = Number(instance.duration);
      const durationMs = Number.isFinite(duration) && duration > 0
        ? Math.round(duration * 1000)
        : 5000;

      // The normal close is driven by the animation's complete event.
      // This timer is only a fallback in case an event is missed.
      completionTimer = window.setTimeout(finish, Math.min(durationMs + 1200, 7200));
    };

    attachPlayerEvents();
    hardStopTimer = window.setTimeout(finish, MAX_INTRO_MS);

    return () => {
      window.clearTimeout(hardStopTimer);
      window.clearTimeout(completionTimer);
      window.clearTimeout(errorTimer);
      window.clearTimeout(pollTimer);
      if (attachedInstance) {
        attachedInstance.removeEventListener("complete", finish);
        attachedInstance.removeEventListener("loadError", failGracefully);
        attachedInstance.removeEventListener("renderError", failGracefully);
      }
    };
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
        ref={playerRef}
        src={import.meta.env.BASE_URL + "gastador-intro.json?v=5"}
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
