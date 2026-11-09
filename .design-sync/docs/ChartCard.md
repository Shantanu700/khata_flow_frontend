---
category: Charts
---

# ChartCard

The panel every KhaataFlow chart sits in: a two-tone title, an optional legend, and a Chart / Table toggle so every value can be read without hovering.

## When to use
Around any chart. Write the chart itself as the children and give a `DataTable` of the same numbers as `table`.

## What you provide
- `title` (`card-title`) and `qualifier` (the muted second line: the period or the headline number).
- `legend`: `{ label, swatch, shape }[]` for two or more series; leave it out for one series (the title names it).
- `table`: the same data as a table.
- `children`: the chart.

## Rules
- Chart marks use the chart tokens (`chart-udhaar`, `chart-vasooli`, `chart-single`, `chart-quiet`, `red` for status), never `lime`.
- Bars at most 24px thick, 4px rounded at the data end and square at the baseline; gridlines 1px `chart-grid`.
- Text in charts uses `ink` and `ink-muted`, never a series colour.
