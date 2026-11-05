import {
  ChartNoAxesColumn,
  House,
  ListChecks,
  ScanLine,
  Settings,
} from "lucide-react";
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
  /^\/activity\/(new|[^/]+)$/,
  /^\/snap\/confirm$/,
  /^\/settings\/allowance\/(new|[^/]+)$/,
];

export function Shell() {
  const { pathname } = useLocation();
  const focused = FOCUSED_ROUTES.some((r) => r.test(pathname));

  return (
    <div className="md:flex md:min-h-dvh">
      <nav
        aria-label="Main"
        className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex"
      >
        <div className="mb-9 px-2">
          <Logo />
        </div>
        <ul className="space-y-1.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group flex min-h-[48px] items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors duration-150 ${
                    isActive ? "bg-soft text-primary" : "text-muted hover:bg-sunken hover:text-ink"
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="mt-auto border-t border-line px-2 pt-4 text-xs leading-relaxed text-muted">
          Your spending stays on this device.
        </p>
      </nav>

      <div className="min-w-0 flex-1">
        <OfflineNotice />
        <main className={focused ? "pb-6 md:pb-10" : "pb-nav md:pb-10"}>
          <div key={pathname} className="route-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {!focused && (
        <nav
          aria-label="Main"
          className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className="relative flex h-[66px] flex-col items-center justify-end gap-0.5 pb-2 text-[11px] font-medium"
                >
                  {({ isActive }) =>
                    to === "/snap" ? (
                      <>
                        <span
                          className={`absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-primary text-onprimary shadow-lift transition-transform duration-150 active:scale-95 ${isActive ? "ring-2 ring-primary/40" : ""}`}
                        >
                          <Icon size={26} strokeWidth={1.9} aria-hidden />
                        </span>
                        <span
                          className={
                            isActive
                              ? "text-primary font-semibold"
                              : "text-muted"
                          }
                        >
                          {label}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className={`flex h-8 w-12 items-center justify-center transition-colors duration-150 ${isActive ? "text-primary" : "text-muted"}`}
                        >
                          <Icon size={22} strokeWidth={1.75} aria-hidden />
                        </span>
                        <span
                          className={
                            isActive
                              ? "text-primary font-semibold"
                              : "text-muted"
                          }
                        >
                          {label}
                        </span>
                      </>
                    )
                  }
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
