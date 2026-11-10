---
category: Screens
---

# Dashboard

The complete KhaataFlow dashboard: header with the shop switcher, hero figures, debtor cards, the udhaar/vasooli, stock and staff charts, the voice panel and recent entries, all on example data for two shops.

## When to use
As the reference for how the pieces compose, and as the starting point for new screens.

## What you provide
Nothing: it uses the built-in example shops (Gupta General Store, Patel Provision Store).

## Rules
- Layout: rail, then a content column; under it a 1fr + 360px grid with the voice panel and entries on the right from 1280px.
- Panels 10px apart (`panel`), sections 32px (`section`).
- On first load panels rise in, figures count up, bars grow and rows arrive; switching shop replays the counts and bars.
