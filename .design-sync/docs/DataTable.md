---
category: Charts
---

# DataTable

A plain table: the first column left-aligned, the others right-aligned with tabular figures, hairlines between rows.

## When to use
As a ChartCard's `table`, and anywhere a short list of numbers reads better as columns.

## What you provide
- `head`: column titles.
- `rows`: cells as strings or numbers; format money with `KhaataFlow.format.inr` first.

## Rules
- Keep it short (a dozen rows or so). Rows are separated by `border` hairlines; no zebra stripes.
