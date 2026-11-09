---
category: Actions
---

# Segmented

A pill toggle for an either/or choice whose lime highlight slides to the picked option.

## When to use
Filters (Sab / Baaki wale / Chukta), the shop switcher in the header, and every chart's Chart / Table toggle. Use it for 2–4 options that change what is shown in place. Use a Button for an action.

## What you provide
- `options`: `{ value, label }[]`. Labels are short: one or two words.
- `value` and `onChange`: it is controlled.
- `label`: the group's accessible name (a sentence a screen reader can say).
- `surface="light"` when it sits on white (the header pill); default `dark`.
- `className` for the track (`bg-card p-1` on canvas, `bg-canvas p-1` inside a card), `itemClassName` for smaller options (`px-3 py-1 text-xs`).

## Rules
- The active option is lime with black text; inactive labels are `ink-muted` on dark and black at 60% on white.
- The highlight slides in 0.4s on the in-out curve; with reduced motion it jumps.
