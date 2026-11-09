---
category: Khata
---

# Debtors

The "Udhaar wale" section: a heading with the customer count, the Sab / Baaki wale / Chukta filter, and a grid of DebtorCards with the biggest balance highlighted.

## When to use
The first section under the hero on the dashboard; any screen listing customers' balances.

## What you provide
- `customers`: sorted by balance, biggest first (the first card with a balance gets the lime highlight).

## Rules
- The grid is one column on phones, two from 640px, four from 1536px; cards sit 10px (`panel`) apart.
- Changing the filter animates the cards in; an empty filter shows a plain card saying so.
