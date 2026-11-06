import { createPortal } from "react-dom";

/**
 * One shared animated atmosphere for every route.
 * It drifts independently and never follows mouse or pointer movement.
 */
export function AmbientBackdrop() {
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
