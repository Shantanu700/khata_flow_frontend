---
category: Motion
---

# Count

A number that counts up to its value when the dashboard loads, and from the old value to the new one when the shop changes.

## When to use
Headline figures (the Hero's KPIs). On its own it simply shows the final value.

## What you provide
- `id`: a stable key per figure, so the next value counts from this one.
- `value` and `format`: `inr` (₹1,25,000) or `int`.

## Rules
- The counting is driven by the dashboard's motion hook (1.1s, ease-out). With reduced motion the number just appears.
- Use proportional figures for big numbers (no `tabular-nums`).
