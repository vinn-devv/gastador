import assert from "node:assert/strict";
import test from "node:test";
import { convertLegacyCycleDate, cycleContainsDate, rangesOverlapInclusive } from "./cycle-dates";
import { toLocalDateString } from "./dates";

process.env.TZ = "Asia/Manila";

test("converts UTC timestamp near midnight to Manila calendar date", () => {
  const converted = convertLegacyCycleDate("2026-11-09T16:00:00.000Z");
  assert.deepEqual(converted, { ok: true, date: "2026-11-10", changed: true });
});

test("leaves an existing YYYY-MM-DD date unchanged", () => {
  assert.deepEqual(convertLegacyCycleDate("2026-11-10"), {
    ok: true, date: "2026-11-10", changed: false,
  });
});

test("reports garbage values without converting them", () => {
  assert.deepEqual(convertLegacyCycleDate("not-a-date"), {
    ok: false, date: null, changed: false,
  });
});

test("adjacent normalized cycles do not overlap", () => {
  const first = convertLegacyCycleDate("2026-11-09T16:00:00.000Z");
  const second = convertLegacyCycleDate("2026-11-10");
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(rangesOverlapInclusive(
    { startDate: first.date, endDate: "2026-11-10" },
    { startDate: "2026-11-11", endDate: "2026-11-20" },
  ), false);
});

test("same-day contact overlaps and a cycle containing today is found", () => {
  assert.equal(rangesOverlapInclusive(
    { startDate: "2026-11-01", endDate: "2026-11-10" },
    { startDate: "2026-11-10", endDate: "2026-11-20" },
  ), true);
  assert.equal(cycleContainsDate(
    { startDate: "2026-11-01", endDate: "2026-11-20" },
    "2026-11-10",
  ), true);
});

test("UTC+8 local midnight keeps its local calendar day", () => {
  const localMidnight = new Date(2026, 10, 10, 0, 0, 0);
  assert.equal(toLocalDateString(localMidnight), "2026-11-10");
});
