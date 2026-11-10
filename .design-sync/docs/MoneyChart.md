---
category: Charts
---

# MoneyChart

Udhaar given against payments received per day for the last 14 days, as grouped columns on one axis.

## When to use
On the dashboard and any money summary. Hover or focus a day for both values; the toggle shows the table.

## What you provide
- `days`: `{ date, udhaar, vasooli }[]`, oldest first.

## Rules
- Udhaar is `chart-udhaar` (orange), vasooli `chart-vasooli` (teal): a pair checked for colour blindness. Keep that mapping everywhere.
- Only each series' peak gets a value label; the axis, tooltip and table carry the rest.
- The qualifier states the totals ("₹5,500 diya, ₹3,000 mila").
