import assert from "node:assert/strict";
import test from "node:test";

import { csvCell } from "./csv";

test("keeps negative numeric amounts plain", () => {
  assert.equal(csvCell(-125.5), '"-125.5"');
  assert.equal(csvCell("-125.50"), '"-125.50"');
});

test("keeps positive numeric amounts plain", () => {
  assert.equal(csvCell(125.5), '"125.5"');
  assert.equal(csvCell("125.50"), '"125.50"');
});

test("neutralises notes beginning with formula characters", () => {
  for (const prefix of ["=", "+", "@", "-"]) {
    assert.equal(csvCell(prefix + "SUM(A1:A2)"), '"' + "'" + prefix + 'SUM(A1:A2)"');
  }
});

test("preserves commas, escapes quotes, and quotes newlines", () => {
  assert.equal(csvCell("lunch, snacks"), '"lunch, snacks"');
  assert.equal(csvCell('said "hello"'), '"said ""hello"""');
  assert.equal(csvCell("first line\nsecond line"), '"first line\nsecond line"');
});

test("writes empty and undefined values as empty quoted cells", () => {
  assert.equal(csvCell(""), '""');
  assert.equal(csvCell(undefined), '""');
});
