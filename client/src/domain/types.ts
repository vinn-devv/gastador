import type { Centavos } from './money';

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type PaymentMethod = 'gcash' | 'maya' | 'cash' | 'bank_transfer' | 'other';
export type TxSource = 'manual' | 'screenshot' | 'receipt';
export type OcrStatus = 'not_applicable' | 'succeeded' | 'corrected' | 'failed';
export type ThemePref = 'system' | 'light' | 'dark';
export type BudgetMethod = 'daily_pace' | 'category_limits' | 'simple_total';
export type CurrencyCode = 'PHP' | 'USD' | 'EUR' | 'SGD';

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
}

export interface Cycle {
  id: string;
  name: string;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  allowanceCentavos: Centavos;
  carryoverCentavos: Centavos;
  plannedSavingsCentavos: Centavos;
  createdAt: string;
}

export interface CycleCategoryLimit {
  cycleId: string;
  categoryId: string;
  limitCentavos: Centavos;
}

export interface Transaction {
  id: string;
  amountCentavos: Centavos;
  occurredAt: string;
  date: string;
  merchant: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  description: string | null;
  source: TxSource;
  ocrStatus: OcrStatus;
  externalReference: string | null;
  isSplurge: boolean;
  receiptHashes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetCentavos: Centavos;
  targetDate: string | null;
  createdAt: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amountCentavos: Centavos;
  contributedAt: string;
}

export interface AlertPrefs {
  dailyReminder: boolean;
  dailyReminderTime: string;
  budget50: boolean;
  budget75: boolean;
  budget90: boolean;
  budget100: boolean;
  categoryOverspend: boolean;
  cycleEndingSoon: boolean;
  cycleEndingDays: number;
  savingsProgress: boolean;
}

export interface AppSettings {
  displayName: string;
  currency: CurrencyCode;
  theme: ThemePref;
  budgetMethod: BudgetMethod;
  onboardingCompleted: boolean;
  alerts: AlertPrefs;
  createdAt: string;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'other', label: 'Other' }
];

export const methodLabel = (m: PaymentMethod): string => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

export const DEFAULT_ALERTS: AlertPrefs = {
  dailyReminder: false,
  dailyReminderTime: '20:00',
  budget50: true,
  budget75: true,
  budget90: true,
  budget100: true,
  categoryOverspend: true,
  cycleEndingSoon: true,
  cycleEndingDays: 2,
  savingsProgress: true
};

export function defaultSettings(now = new Date()): AppSettings {
  return {
    displayName: '',
    currency: 'PHP',
    theme: 'dark',
    budgetMethod: 'daily_pace',
    onboardingCompleted: false,
    alerts: { ...DEFAULT_ALERTS },
    createdAt: now.toISOString()
  };
}
