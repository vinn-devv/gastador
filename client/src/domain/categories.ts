import type { Category } from './types';

export interface CategoryDef {
  key: 'food' | 'transport' | 'school' | 'bills' | 'personal' | 'others';
  name: string;
  match: RegExp;
}

export const STANDARD_CATEGORIES: CategoryDef[] = [
  { key: 'food', name: 'Food', match: /food|drink|meal|snack/i },
  { key: 'transport', name: 'Transport', match: /transport|commute|fare/i },
  { key: 'school', name: 'School Supplies', match: /school|supplies|tuition/i },
  { key: 'bills', name: 'Bills', match: /bill|utilit|load/i },
  { key: 'personal', name: 'Personal', match: /personal|health|care/i },
  { key: 'others', name: 'Others', match: /^others?$|^misc/i }
];

export function findStandardMatch(categories: Category[], key: CategoryDef['key']): Category | undefined {
  const def = STANDARD_CATEGORIES.find((d) => d.key === key)!;
  return categories.find((c) => !c.archivedAt && def.match.test(c.name));
}

export function missingStandardCategories(categories: Category[]): CategoryDef[] {
  return STANDARD_CATEGORIES.filter((def) => !categories.some((c) => def.match.test(c.name)));
}

export const normalizeName = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

export const CATEGORY_HINTS: { key: CategoryDef['key']; match: RegExp }[] = [
  { key: 'food', match: /milk ?tea|jollibee|mcdo|mcdonald|kfc|chowking|coffee|cafe|bakery|restaurant|carinderia|7-?eleven|grill|pizza|burger|starbucks|mang inasal|bubble|food|ministop|famous ?rec|dunkin|greenwich|shakey/i },
  { key: 'transport', match: /grab|angkas|jeep|mrt|lrt|beep|toll|taxi|petron|shell|caltex|joyride|move it|fuel|bus|tricycle/i },
  { key: 'school', match: /school|bookstore|print|xerox|national book|tuition|supplies|photocopy|university|college/i },
  { key: 'bills', match: /meralco|globe|smart|pldt|converge|water district|electric|wifi|load|dito|tnt|sun cellular/i },
  { key: 'personal', match: /mercury|watsons|pharmacy|clinic|hospital|drug|salon|barber|uniqlo|puregold|robinsons|shopee|lazada/i }
];

export function suggestCategoryKey(text: string): CategoryDef['key'] | undefined {
  return CATEGORY_HINTS.find((h) => h.match.test(text))?.key;
}
