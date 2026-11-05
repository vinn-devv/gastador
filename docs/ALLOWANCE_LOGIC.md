# Allowance logic

All rules live in `client/src/domain/allowance.ts` and are covered by `allowance.test.ts`.

## Conventions

- **Dates** are Philippine calendar dates (Asia/Manila). "Today" is the current Manila date.
- **Inclusive ranges.** A cycle includes both its start date and its end date. A cycle from Nov 1 to Nov 14 has 14 days.
- **Money** is integer centavos.

## Formulas

```
spendable   = allowance + carryover - planned savings
spent       = sum of expenses whose date is within [start, end]
remaining   = spendable - spent
```

Savings contributions to goals are separate records and never enter `spent`. Planned savings is the amount the user sets aside on a cycle, and it reduces `spendable`.

```
days remaining  (active)    = days from today to end date, counting both    (last day = 1)
days remaining  (upcoming)  = total days in the cycle
days remaining  (ended)     = 0

daily safe limit = floor(remaining / days remaining)   if remaining > 0
                 = 0                                    if remaining <= 0
                 = not applicable (null)                if the cycle has ended
```

Rounding down means `limit x days remaining` never exceeds the money left. Today's spending is already inside `remaining`, so the limit shrinks as you spend during the day.

## Pace wording (never judgemental)

| State | Meaning |
| --- | --- |
| `not_started` | Cycle is in the future |
| `on_track` | `spent x totalDays <= spendable x daysElapsed` |
| `above_pace` | Spending is above the straight-line plan |
| `over_budget` | `remaining < 0` |
| `ended` | Cycle is over |

The comparison uses integer cross-multiplication, so there is no rounding. A **splurge** is only a tag the user sets by hand. No code assigns it.

## Edge cases and what happens

| Case | Behaviour |
| --- | --- |
| Future cycle | Shown as upcoming with days until start; daily amount is spendable / total days |
| Expired cycle | Shown as ended with a banner to start the next one; no daily limit |
| Zero days remaining | Never divides by zero; limit is null |
| Negative balance | Shows "Over the allowance by", daily limit is 0 |
| Overlapping cycles | Rejected when saving, including via import (adjacent cycles are fine) |
| Expense edited into another cycle | Moves automatically because membership is derived from its date |
| Expense on a date no cycle covers | Saved, but does not change any balance; the form says so |
| Currency rounding | Averages round half up; limits round down; nothing uses floats |
| Several cycles at once | Not possible. The current cycle is the active one, else the nearest upcoming or most recent ended one |

## Next allowance date

The setup screen asks when the **next** allowance arrives; the cycle's last day is the day before. Presets: weekly +7 days, biweekly +14 days, monthly +1 calendar month (end of month clamps, so Jan 31 becomes Feb 28). Custom lets the user pick any date.

## Carryover

When creating a cycle the user may carry over from a previous cycle. Only a positive remainder carries (`max(0, spendable - spent)`), computed at creation.
