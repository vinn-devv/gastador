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
  color: string;
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
  needsReview?: number;
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

export interface SettingsPreferences {
  numberFormat: 'comma' | 'dot';
  symbolPlacement: 'before' | 'after' | 'hidden';
  showDecimals: boolean;
  dateFormat: 'DMY' | 'MDY' | 'YMD' | 'DMMM';
  firstDayOfWeek: 'sunday' | 'monday';
  textSize: 'default' | 'large';
  haptics: boolean;
  reduceMotion: boolean;
  hideBalance: boolean;
  hideAppPreview: boolean;
  defaultCategoryId: string;
  defaultPaymentMethod: PaymentMethod;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  weeklySummary: boolean;
  weeklySummaryDay: number;
  weeklySummaryTime: string;
  budgetAlert80: boolean;
  budgetAlert100: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
}

export const DEFAULT_PREFERENCES: SettingsPreferences = {
  numberFormat: 'comma', symbolPlacement: 'before', showDecimals: true,
  dateFormat: 'DMMM', firstDayOfWeek: 'monday', textSize: 'default',
  haptics: true, reduceMotion: false, hideBalance: false, hideAppPreview: false,
  defaultCategoryId: '', defaultPaymentMethod: 'cash',
  quietHoursEnabled: false, quietHoursStart: '22:00', quietHoursEnd: '07:00',
  weeklySummary: false, weeklySummaryDay: 0, weeklySummaryTime: '18:00',
  budgetAlert80: true, budgetAlert100: true, dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
};

export interface AppSettings {
  displayName: string;
  currency: CurrencyCode;
  theme: ThemePref;
  budgetMethod: BudgetMethod;
  onboardingCompleted: boolean;
  hasOnboarded: boolean;
  alerts: AlertPrefs;
  preferences: SettingsPreferences;
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
    theme: 'system',
    budgetMethod: 'daily_pace',
    onboardingCompleted: false,
    hasOnboarded: false,
    alerts: { ...DEFAULT_ALERTS },
    preferences: { ...DEFAULT_PREFERENCES },
    createdAt: now.toISOString()
  };
}
