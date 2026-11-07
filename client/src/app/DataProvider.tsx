import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  pickCurrentCycle,
  summarizeCycle,
  type CurrentCycle,
  type CycleSummary,
} from "../domain/allowance";
import { manilaToday } from "../domain/dates";
import type { Category } from "../domain/types";
import { subscribe } from "../data/events";
import { migrateLegacyReceiptImages } from "../data/legacy";
import { loadWorld, type WorldData } from "../data/repo";

interface DataContextValue {
  world: WorldData | null;
  error: Error | null;
  today: string;
  current: CurrentCycle | null;
  summary: CycleSummary | null;
  categoryById: Map<string, Category>;
  activeCategories: Category[];
  reload: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

export function useWorld(): WorldData {
  const { world } = useData();
  if (!world) throw new Error("World is not loaded yet");
  return world;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [today, setToday] = useState(manilaToday());
  const generation = useRef(0);

  const reload = useCallback(() => {
    const mine = ++generation.current;
    loadWorld()
      .then((w) => {
        if (mine === generation.current) {
          setWorld(w);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (mine === generation.current)
          setError(
            e instanceof Error ? e : new Error("Could not open local storage."),
          );
      });
  }, []);

  useEffect(() => {
    reload();
    migrateLegacyReceiptImages().catch(() => undefined);
    const unsubscribe = subscribe(reload);
    const tick = window.setInterval(
      () =>
        setToday((prev) => {
          const next = manilaToday();
          return next === prev ? prev : next;
        }),
      30_000,
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") setToday(manilaToday());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  useEffect(() => {
    // Gastador now uses one fixed visual theme; ignore legacy saved theme preferences.
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "dark";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#061a30");
  }, []);

  const value = useMemo<DataContextValue>(() => {
    const current = world ? pickCurrentCycle(world.cycles, today) : null;
    const summary =
      world && current
        ? summarizeCycle(current.cycle, world.transactions, today)
        : null;
    const categoryById = new Map(
      (world?.categories ?? []).map((c) => [c.id, c]),
    );
    return {
      world,
      error,
      today,
      current,
      summary,
      categoryById,
      activeCategories: (world?.categories ?? []).filter((c) => !c.archivedAt),
      reload,
    };
  }, [world, error, today, reload]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
