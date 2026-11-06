import { ChartNoAxesColumn, House, ListChecks, ScanLine, Settings, ShieldCheck } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { OfflineNotice } from "../components/ui/Bits";
import { Logo } from "../components/Logo";

const NAV = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/activity", label: "Activity", icon: ListChecks, end: false },
  { to: "/snap", label: "Snap", icon: ScanLine, end: false },
  { to: "/insights", label: "Insights", icon: ChartNoAxesColumn, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
] as const;

const FOCUSED_ROUTES = [
  new RegExp("^/activity/(new|[^/]+)$"),
  new RegExp("^/snap/confirm$"),
  new RegExp("^/settings/allowance/(new|[^/]+)$"),
];

export function Shell() {
  const { pathname } = useLocation();
  const focused = FOCUSED_ROUTES.some((route) => route.test(pathname));

  return (
    <div className="app-shell">
      <header className="app-topbar no-print">
        <div className="app-topbar__inner">
          <div className="app-topbar__brand"><Logo /></div>
          <nav aria-label="Main" className="app-topbar__nav">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => "app-topbar__link" + (isActive ? " is-active" : "")}
              >
                <Icon size={17} strokeWidth={1.8} aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="app-topbar__privacy">
            <span className="app-topbar__privacy-icon"><ShieldCheck size={15} /></span>
            <span>On this device</span>
          </div>
        </div>
      </header>

      <div className="app-shell__body">
        <OfflineNotice />
        <main className={focused ? "app-main app-main--focused" : "app-main"}>
          <div key={pathname} className="route-enter"><Outlet /></div>
        </main>
      </div>

      {!focused && (
        <nav
          aria-label="Main"
          className="app-mobile-dock no-print"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    "app-mobile-dock__link" + (isActive ? " is-active" : "") + (to === "/snap" ? " is-snap" : "")
                  }
                >
                  <span className="app-mobile-dock__icon">
                    <Icon size={to === "/snap" ? 23 : 20} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
