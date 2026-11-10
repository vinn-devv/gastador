export const SHEET_GAP = 12;

export function navBarSpace(bottomInset: number): number {
  const safeBottom = Math.max(bottomInset, SHEET_GAP);
  return 72 + safeBottom + 32 + SHEET_GAP;
}
