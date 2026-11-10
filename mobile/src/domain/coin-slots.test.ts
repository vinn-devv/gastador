import assert from "node:assert/strict";
import test from "node:test";
import { getCoinSlots } from "./coin-slots";

const sizes = [
  { width: 360, height: 640 },
  { width: 393, height: 852 },
  { width: 412, height: 915 },
];

for (const { width, height } of sizes) {
  test(`coin slots stay finite and on-screen at ${width}x${height}`, () => {
    const slots = getCoinSlots(width, height, { top: 24, bottom: 24 });
    assert.equal(slots.length, 3);
    for (const slot of slots) {
      assert.ok(Number.isFinite(slot.x));
      assert.ok(Number.isFinite(slot.y));
      assert.ok(Number.isFinite(slot.size));
      assert.ok(slot.size >= 40);
      assert.ok(slot.x - slot.size / 2 >= 0);
      assert.ok(slot.x + slot.size / 2 <= width);
      assert.ok(slot.y - slot.size / 2 >= 0);
      assert.ok(slot.y + slot.size / 2 <= height);
    }
  });
}
