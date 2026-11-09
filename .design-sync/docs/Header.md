---
category: Layout
---

# Header

The reference's white schedule pill, used as KhaataFlow's top bar: the logo, a shop switcher (one login per shop), today's date and the notification bell.

## When to use
Once, at the top of every screen.

## What you provide
- `shops`: `{ id, shop }[]` (the shop names).
- `shopId` and `onShop`: the switcher is controlled.

## Rules
- The pill is white with black text; its Segmented uses `surface="light"`.
- Under 768px the shop names shorten to their first word and the date hides.
- The bell's red dot means unread alerts; add a count only if there is one to show.
