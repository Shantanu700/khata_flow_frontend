---
category: Khata
---

# Entries

The six latest ledger entries, newest first, worded like the backend's spoken replies ("Sharma ji se ₹300 mile", "Ramu ki haaziri").

## When to use
Beside the voice panel, or anywhere a short activity feed helps.

## What you provide
- `entries`: `{ id, kind, name, value, date }[]`, newest first.

## Rules
- Each row: a `raised` icon circle (with an `chart-udhaar` or `chart-vasooli` dot for money), the description, its kind, and a relative day ("Kal", "2 din pehle").
- Don't add amounts in colour; the dot carries the kind.
