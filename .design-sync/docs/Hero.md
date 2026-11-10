---
category: Khata
---

# Hero

The title row: "KHAATA." in light uppercase, the white "Bolke likho" (speak to record) button, and the shop's figures with "udhaar baaki" as the single hero figure.

## When to use
Directly under the header, once per screen.

## What you provide
- `view`: a `ShopView` (the figures are derived from it: outstanding, low-stock count, staff dues).
- `onSpeak`: what the "Bolke likho" button does (in the dashboard it starts the voice panel).

## Rules
- Exactly one hero figure (`hero-figure`, 60px light). The others use `figure` (36px).
- Each figure has a small badge above its label: lime for the debtor count, red for low stock that needs attention, `raised` otherwise.
- Inside a dashboard using `useDashboardMotion`, the figures count up on load and between shops.
