---
category: Charts
---

# StockChart

Each product's stock as a ranked bar with its low-stock threshold marked; items at or under the threshold turn red and carry a "kam" chip.

## When to use
Anywhere stock is reviewed. Products come most critical first (stock ÷ threshold).

## What you provide
- `products`: `{ name, unit, stock, threshold, isLow }[]`, already sorted.

## Rules
- Low stock is `red` with a warning icon and the word "kam"; everything else `chart-quiet`. Don't colour fine stock green.
- The threshold is a 2px white tick at 60%.
- On phones the name and value share a line and the bar runs full width below.
