# Migrating from the old online version

The old app kept data in PostgreSQL behind an email and password. The new app keeps it on the device. **Nothing on the old server is deleted by the new app.** Keep the server and database until every user has confirmed their data.

## Two ways to migrate

1. **Direct import (easiest).** On a device that can reach the old server (open the new app from the same address, or through the dev or preview proxy), choose **I already have data to bring over**, then **Import from old online account**, and sign in. The app logs in, downloads your account export, signs out, shows a count preview, and imports on confirmation. Your password goes only to the old server.
2. **From a file.** Sign in to the old version and use its data export (`GET /api/me/export`, saved as JSON). In the new app choose the same option but pick the file. The app recognises the old format automatically.

Both paths use the same converter (`client/src/data/legacy.ts`) and the same safe merge.

## What is converted

| Old | New |
| --- | --- |
| `numeric` amounts such as `"2000.50"` | Integer centavos, parsed from the digits (no floats) |
| Cycles (`total_amount`, `carried_over_amount`, `savings_allocation`) | Cycles (`allowance`, `carryover`, `plannedSavings`) |
| Category budgets | Per-cycle category limits |
| Transactions with `is_splurge`, `external_reference`, OCR status | Same fields; Manila date derived from the timestamp |
| Receipt metadata | Links to images by SHA-256 hash |
| Savings goals and contributions | Same, still separate from expenses |
| Settings (name, theme, budget method, alert preferences) | Same |
| The special Savings category | Not copied. Nothing could be spent from it |
| Default category names (Food and Drinks, Transportation, School Expenses, Bills and Utilities, Health and Personal Care) | Renamed to Food, Transport, School Supplies, Bills, Personal so they merge with the new standard six. Your own custom categories (for example Entertainment, Shopping) are kept |

The new app then ensures all six standard categories exist.

## Receipt images

Images were already stored in the browser's IndexedDB (`gastador-receipts`). On first start the new app copies any it finds into its own store. It does not delete the old copy. Images only follow the browser they were saved in; they are not on the server.

## Dates from older exports

The old API returned `date` columns as JavaScript dates, so their JSON form depended on the server's timezone (`2026-10-25T00:00:00.000Z` on a UTC server, `2026-10-24T16:00:00.000Z` on a Manila server). The importer reads midnight-UTC as that calendar date and anything else as its Manila date, so both come out as `2026-10-25`. The server now returns plain `YYYY-MM-DD`.

## Safety properties (tested)

- Merge adds only what is missing, by id, and never duplicates. Running the import twice adds nothing the second time.
- Cycles that would overlap existing ones are skipped and reported.
- Backups and restores validate the whole file first, then write in one IndexedDB transaction. A bad file changes nothing.
- Real export from the old server, produced by running it against PostgreSQL, is a test fixture (`client/src/test/fixtures/legacy-export.json`).

## Retiring the old backend

Only after every user has migrated and kept a JSON backup: stop the server, take a final `pg_dump`, and archive it. Nothing in the new client needs the server.
