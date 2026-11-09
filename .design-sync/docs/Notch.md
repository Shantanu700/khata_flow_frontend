---
category: Layout
---

# Notch

A cut-out in a card's corner, painted in the colour behind the card, that holds a round control; two fillets curve the card's edge into it.

## When to use
The ↗ "open" button on debtor cards and any card whose single action belongs in a corner. One notch per card.

## What you provide
- A parent card with `position: relative` and a 32px radius.
- `corner`: `tl`, `tr`, `br` or `bl`.
- `r`: the inner radius (`notch-r`, 28px; 22px on small cards) and `gap` (8px; 6px on small cards).
- `bg`: the colour behind the card, default `var(--canvas)`. Get this right or the notch shows as a patch.
- `children`: a round 40px button on `surface` with an `aria-label`.

## Rules
- The control inside is a circle; it turns 45° on hover in KhaataFlow.
- Don't put text in a notch.
