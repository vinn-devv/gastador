import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  canAddGoal,
  canImportMore,
  isUnlocked,
  maxInsightsDays,
  type AccessContext,
} from "../billing/features";
import { createProvider, entitlementStore } from "../billing/store";
import type {
  BillingStatus,
  Entitlement,
  PurchaseOutcome,
} from "../billing/types";

interface BillingContextValue {
  status: BillingStatus | null;
  entitlement: Entitlement | null;
  unlocked: boolean;
  enforcement: boolean;
  prototypeMode: boolean;
  setPrototypeMode: (enabled: boolean) => void;
  busy: boolean;
  purchase: () => Promise<PurchaseOutcome>;
  restore: () => Promise<PurchaseOutcome>;
  canImport: (importsThisCycle: number) => boolean;
  canAddGoal: (goalCount: number) => boolean;
  insightsDays: number;
}

const BillingContext = createContext<BillingContextValue | null>(null);

const PROTOTYPE_KEY = "gastador_prototype_access";

function getInitialPrototypeMode(): boolean {
  try {
    const saved = localStorage.getItem(PROTOTYPE_KEY);
    // Defaults to true for prototype testing unless explicitly toggled off
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used inside BillingProvider");
  return ctx;
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const provider = useMemo(createProvider, []);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [busy, setBusy] = useState(false);
  const [prototypeMode, setPrototypeModeState] = useState<boolean>(
    getInitialPrototypeMode,
  );

  const setPrototypeMode = useCallback((enabled: boolean) => {
    setPrototypeModeState(enabled);
    try {
      localStorage.setItem(PROTOTYPE_KEY, String(enabled));
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    entitlementStore
      .get()
      .then(setEntitlement)
      .catch(() => undefined);
    provider
      .status()
      .then(setStatus)
      .catch(() => undefined);
  }, [provider]);

  const settle = useCallback(
    async (outcome: PurchaseOutcome): Promise<PurchaseOutcome> => {
      if (outcome.ok) {
        await entitlementStore.set(outcome.entitlement);
        setEntitlement(outcome.entitlement);
      }
      return outcome;
    },
    [],
  );

  const run = useCallback(
    async (fn: () => Promise<PurchaseOutcome>) => {
      setBusy(true);
      try {
        return await settle(await fn());
      } finally {
        setBusy(false);
      }
    },
    [settle],
  );

  const access: AccessContext = useMemo(
    () => ({
      entitlement,
      enforcement: true, // Always enforce so prototype mode toggle is meaningful and testable!
      production: import.meta.env.PROD === true,
      prototypeMode,
    }),
    [entitlement, prototypeMode],
  );

  const value = useMemo<BillingContextValue>(
    () => ({
      status: prototypeMode
        ? {
            kind: "test",
            canPurchase: true,
            reason:
              "Interactive Prototype Mode. All ₱99 plan features are unlocked for preview and testing.",
            priceLabel: "₱99",
          }
        : status,
      entitlement,
      unlocked: isUnlocked(access),
      enforcement: access.enforcement,
      prototypeMode,
      setPrototypeMode,
      busy,
      purchase: () => run(() => provider.purchase()),
      restore: () => run(() => provider.restore()),
      canImport: (n) => canImportMore(access, n),
      canAddGoal: (n) => canAddGoal(access, n),
      insightsDays: maxInsightsDays(access),
    }),
    [
      status,
      entitlement,
      access,
      busy,
      run,
      provider,
      prototypeMode,
      setPrototypeMode,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}
