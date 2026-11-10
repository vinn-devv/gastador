import type { EdgeInsets } from "react-native-safe-area-context";

export type CoinSlot = { x: number; y: number; size: number };

export function getCoinSlots(width: number, height: number, insets: Pick<EdgeInsets, "top" | "bottom">): [CoinSlot, CoinSlot, CoinSlot] {
  const safeWidth = Math.max(80, Number.isFinite(width) ? width : 360);
  const safeHeight = Math.max(120, Number.isFinite(height) ? height : 640);
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const fitSize = (requested: number) => clamp(requested, 40, Math.max(40, Math.min(safeWidth, safeHeight) - 2));
  const centeredY = (requested: number, size: number) => clamp(requested, size / 2 + 1, safeHeight - size / 2 - 1);

  const pageOneSize = fitSize(Math.min(safeWidth * 0.7, 280));
  const headerSize = fitSize(64);
  const pageThreeSize = fitSize(Math.min(220, safeWidth - 48, safeHeight * 0.34));

  return [
    { x: safeWidth / 2, y: centeredY(safeHeight * 0.6, pageOneSize), size: pageOneSize },
    { x: clamp(safeWidth - headerSize / 2 - 24, headerSize / 2 + 1, safeWidth - headerSize / 2 - 1), y: centeredY(insets.top + 76, headerSize), size: headerSize },
    { x: safeWidth / 2, y: centeredY(safeHeight * 0.35, pageThreeSize), size: pageThreeSize },
  ];
}
