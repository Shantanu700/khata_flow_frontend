---
category: Charts
---

# StaffMeters

Each staff member's month so far: days present, salary, and a thin segmented meter of what they earned, split into advance already given and what is still due.

## When to use
The "Staff khata" panel. It reads well full-width (two people side by side) or in a column.

## What you provide
- `staff`: `{ name, salary, daysPresent, earned, advances, due }[]`.
- `className`, e.g. `lg:col-span-2` in a grid.

## Rules
- Advance is `chart-quiet`, still due is `chart-single`; the figures are written beside the meter, so the meter carries no text.
- The big number on each row is what is still due.
