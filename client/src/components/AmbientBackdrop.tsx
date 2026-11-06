import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * A single atmospheric layer shared by every route.
 * The background is CSS-driven and local, so it stays available offline.
 */
export function AmbientBackdrop() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;

      const x = (event.clientX / Math.max(window.innerWidth, 1)) * 100;
      const y = (event.clientY / Math.max(window.innerHeight, 1)) * 100;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--ambient-pointer-x", x + "%");
        document.documentElement.style.setProperty("--ambient-pointer-y", y + "%");
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--ambient-pointer-x");
      document.documentElement.style.removeProperty("--ambient-pointer-y");
    };
  }, []);

  return createPortal(
    <div className="app-atmosphere" aria-hidden="true">
      <div className="app-atmosphere__wash" />
      <div className="app-atmosphere__orb app-atmosphere__orb--one" />
      <div className="app-atmosphere__orb app-atmosphere__orb--two" />
      <div className="app-atmosphere__ribbon" />
      <div className="app-atmosphere__texture" />
    </div>,
    document.body,
  );
}
