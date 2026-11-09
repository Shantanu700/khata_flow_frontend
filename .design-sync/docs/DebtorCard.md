---
category: Khata
---

# DebtorCard

One customer's khata at a glance: initials, name, what was given and paid, the balance, and the five-dot repayment scale.

## When to use
In a grid of customers (see Debtors). Make exactly one card per row `highlight` (lime): the biggest balance.

## What you provide
- `customer`: `{ name, given, paid, balance, repaid }` (`repaid` is paid ÷ given, 0–1).
- `highlight`: lime card with black text.
- A list parent: the card is an `<li>`, so render it inside a `<ul>`.

## Rules
- The five dots use `heat-1` … `heat-5` in order and always sit beside the percentage in words ("42% vasooli"), so colour is never the only cue.
- The ↗ button sits in a top-right Notch.
- A settled customer shows ₹0 and five filled dots; don't hide them in "Sab".
