---
category: Motion
---

# RollText

Text that rises into its box from below, behind a mask, whenever its `rollKey` changes.

## When to use
Labels that change in place when the shop or a filter changes (badges, titles).

## What you provide
- `children`: the text.
- `rollKey`: change it to trigger the roll (usually the value itself, or the shop id).

## Rules
- 0.45s on the ease-out curve; reduced motion fades instead.
- Use it for short labels, not paragraphs.
