import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, decimal, dateDiffInclusive, addDateDays } from '../src/lib/money.js';

test('money is converted through integer centavos', () => {
  assert.equal(cents('125.40'), 12540);
  assert.equal(decimal(12540), '125.40');
  assert.equal(cents('0.01'), 1);
});

test('date ranges count both allowance start and end dates', () => {
  assert.equal(dateDiffInclusive('2026-10-31', '2026-11-13'), 14);
  assert.equal(dateDiffInclusive('2024-02-28', '2024-03-01'), 3);
});

test('date addition handles month and year boundaries', () => {
  assert.equal(addDateDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDateDays('2024-02-28', 1), '2024-02-29');
});

test('DATE columns are returned as plain calendar strings regardless of server timezone', async () => {
  process.env.DATABASE_URL ||= 'postgresql://user:pw@localhost:5432/unused';
  const { default: pg } = await import('pg');
  await import('../src/db/pool.js');
  const parse = pg.types.getTypeParser(1082);
  assert.equal(parse('2026-10-25'), '2026-10-25');
});
