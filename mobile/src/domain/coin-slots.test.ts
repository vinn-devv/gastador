import assert from "node:assert/strict";
import test from "node:test";
import { getCoinSlots } from "./coin-slots";

const sizes = [
  { width: 360, height: 640 },
  { width: 393, height: 852 },
  { width: 412, height: 915 },
];

for (const { width, height } of sizes) {
  test(`coin slots stay finite and visible at ${width}x${height}`, () => {
    const insets = { top: 24, bottom: 24 };
    const slots = getCoinSlots(width, height, insets);
    assert.equal(slots.length, 3);

    for (const [index, slot] of slots.entries()) {
      const viewportX = slot.x - index * width;
      assert.ok(Number.isFinite(slot.x));
      assert.ok(Number.isFinite(slot.y));
      assert.ok(Number.isFinite(slot.size));
      assert.ok(slot.size >= 40);
      assert.ok(viewportX - slot.size / 2 >= 0);
      assert.ok(viewportX + slot.size / 2 <= width);
      assert.ok(slot.y - slot.size / 2 >= 0);
      assert.ok(slot.y + slot.size / 2 <= height);
    }

    assert.equal(slots[1].size, 64);
    assert.ok(Math.abs((slots[1].x - width) - (width - 56)) < 0.001);
    assert.ok(Math.abs(slots[1].y - (insets.top + 96)) < 0.001);
  });
}
