---
category: Voice
---

# VoicePanel

The voice agent: a black card with the lime mic and the four pipeline steps (Suna: heard by Gnani Prisma; Samjha: understood; Likha: written to the khata; Bola: spoken by Gnani Timbre), above a paper card with what the shopkeeper said and KhaataFlow's reply.

## When to use
The right column of the dashboard. It is the product's centrepiece: keep it visible.

## What you provide
- `demos`: `{ heard, reply, stage }[]`. Each press plays the next one. These are example commands with the backend's real replies; it records nothing.
- `ref` (optional): `{ play() }` so another control ("Bolke likho") can start it.

## Rules
- Listening: two lime rings pulse from the mic. Then the steps light lime in order, the heard words rise in one by one, and the reply lifts in on black with a stage chip: `lime` "Likh diya" (written), `cyan` "Jawab" (answered), `heat-3` "Sawaal" (a question back).
- The transcript card is `paper` with black text.
- Label it as an example wherever it shows demo data.
