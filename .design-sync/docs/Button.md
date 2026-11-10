---
category: Actions
---

# Button

The shadcn button on Radix: a pill with a lime default that carries black text.

## When to use
- `default` (lime) for the one primary action in a view: "Entry likho", "Bolke likho". One per view.
- `secondary` (raised grey) for ordinary actions; `outline` and `ghost` for low-emphasis ones; `destructive` only for removing or undoing an entry; `link` for navigation inside text.

## What you provide
- `children`: a short Hinglish verb phrase, sentence case.
- `variant`, `size` (`xs`, `sm`, `default`, `lg`, or `icon`, `icon-xs`, `icon-sm`, `icon-lg` for a lone icon with an `aria-label`).
- `asChild` to style a link or another element as a button.

## Rules
- Text on `lime` is always black (17.6:1); never white.
- Every button is a pill (`radius-pill`). Do not square it off.
- Round icon-only actions elsewhere in KhaataFlow (rail, bell, notch arrows) use `raised` circles of 40–44px; use `size="icon"` for the same job.
