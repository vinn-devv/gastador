export const SHEET_GAP = 12;

// Clearance for the 72dp dock, floating add button, outer sheet gap,
// and Android/iOS safe-area inset.
export function navBarSpace(bottomInset: number): number {
  const safeBottom = Math.max(bottomInset, SHEET_GAP);
  return 72 + safeBottom + 32 + SHEET_GAP;
}
