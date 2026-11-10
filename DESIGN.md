# KhataFlow design system

Visual reference: the HubSpot CRM SaaS redesign case study in `../Design/` (Behance). We borrow its palette, type and component shapes, never its logo or name. Motion follows the owner's Lead Flow frontend (`github.com/Shantanu700/lead_flow_frontend`, its `DESIGN.md` § Motion).

Tokens live in `app/globals.css`. Use the Tailwind classes they generate (`bg-card`, `bg-lime`, `text-muted-foreground`, `bg-udhaar`) and never hard-code a hex value in a component.

## Colour

Sampled from the reference's own pixels (`Design/89-…jpg` is its colour page; its swatches print `#000000` as placeholder text). **Dark only**: the reference has no light theme, so `<html>` always carries `.dark` and there is no theme toggle.

| Role | Token | Hex | Use |
|---|---|---|---|
| Canvas | `canvas` / `background` | `#1A1A1A` | Page background |
| Surface | `surface` / `card` | `#2E2E2E` | Cards, chart panels |
| Raised | `raised` / `secondary` | `#434343` | Icon buttons, chips, tooltips, avatars |
| Hairline | `hairline` | `#5F5F5F` | Rare outlines; containers have none |
| Paper | `paper` | `#E5E5E5` | The reference's light summary panel (voice transcript). Black text on it |
| Ink | `foreground` | `#FFFFFF` | Main text |
| Muted ink | `muted-foreground` | `#B3B3B3` | Secondary text: 8.3:1 on canvas, 6.5:1 on card, 4.7:1 on raised |
| Lime | `lime` / `primary` | `#B9FF66` | The accent: active pills, the highlighted card, the mic, focus rings. **Black text only** (17.6:1; white is 1.2:1) |
| Cyan | `cyan` | `#66FFED` | Secondary accent ("Jawab" chip) |
| Red | `red` / `destructive` | `#EF4949` | Alerts, low stock, the notification dot |
| Red ink | `red-ink` | `#FFB3B3` | Small red text on dark (8:1); `red` itself is 3.7:1 |
| Heat 1–5 | `heat-1` … `heat-5` | `#FE9695` `#FFA566` `#FFDD67` `#A9FF66` `#69FF67` | The reference's five-dot scale, cold to hot. Debtor cards use it for "how much has come back" |

Use lime sparingly: one highlighted card per row, the active pill, the primary action. Inactive controls stay grey.

### Chart colours

Every chart colour was checked with the dataviz skill's `validate_palette.js` against the card (`#2E2E2E`, dark mode). The neon brand colours sit at OKLCH L ≈ 0.92, outside the dark-mode band (0.48–0.67), so charts use deeper steps of the same hues.

| Token | Hex | From | Job |
|---|---|---|---|
| `udhaar` | `#D06F1B` | the heat orange | Series: credit given |
| `vasooli` | `#009B8E` | the cyan | Series: payment received |
| `chart-single` | `#6BA600` | the lime | One-series marks (staff dues) |
| `chart-quiet` | `#808080` | grey | De-emphasised marks |
| `red` | `#EF4949` | the red | Status: low stock, always with an icon and "kam" |

The udhaar/vasooli pair passes every check: CVD ΔE 13.7 (protan), normal-vision ΔE 23.7. Two pairs were tried and rejected: lime/cyan (normal ΔE 14.6, too close) and orange/lime (deutan ΔE 0.8, invisible to red-green colour blindness).

## Type

- **Urbanist** (the reference's font) for everything, via `next/font`. Geist Mono only for code.
- A light hand: `font-light` for big figures and the page title, `font-normal` for headings and body, `font-medium` for labels and buttons. No bold.
- **Two-tone titles**: the title in ink and its qualifier on the next line in `text-muted-foreground` ("Stock / 3 cheezein threshold se neeche").
- Big figures are light, with a small badge and unit beside them ("₹2,500 [3 log] udhaar baaki"). Exactly one hero figure per view (the outstanding total, `text-6xl`).
- Money is always `inr()` from `lib/format.ts`: Indian grouping (₹1,25,000), paise only when non-zero.
- Copy is Hinglish, matching the backend's spoken replies.

## Shape and spacing

| Class | Value | Applies to |
|---|---|---|
| `rounded-xl` | 32px | Cards and panels (`2xl`–`4xl` are capped at 32px) |
| `rounded-lg` | 24px | A block inside a card (the voice reply) |
| `rounded-md` | 18px | Rows, tooltips, hover washes |
| `rounded-full` | pill | Every control: buttons, chips, filters, avatars |

- Panels sit `gap-panel` (10px) apart; sections `gap-8`. Card padding `p-6` (`p-5` on debtor cards).
- No outlines on containers: surface colour separates them. No shadows except tooltips.
- **Notches** (`components/notch.tsx`, from Lead Flow): a cut-out in a card's corner, in the colour behind the card, holding a round control. The fillets curve the card's edge into it. Debtor cards put their ↗ button in a top-right notch.
- Icon-only actions are round `size-10`/`size-11` buttons on `raised`.

## Components

- **shadcn on Radix** (`components.json` style `radix-luma`). Add components with `bunx shadcn add <name>`.
- `Segmented` (`components/segmented.tsx`): the pill toggle for every either/or choice. The lime highlight slides to the chosen option. `surface="light"` on white backgrounds.
- `ChartCard` + `DataTable` (`components/dashboard/charts/chart-card.tsx`): every chart sits in one, with a two-tone title, a legend and a Chart/Table toggle.

## Data visualisation

Follows the dataviz skill. In short:

- Pick the form first: ranked bars for stock, grouped columns for the 14-day money trend, thin segmented meters for staff dues, a stat row for the headline numbers. No pies, no dual axes.
- Bars ≤ 24px thick, 4px rounded at the data end and square at the baseline, 2px surface gap between neighbours. Gridlines are 1px solid at 8% white.
- A legend whenever there are two or more series; direct labels only on peaks. Text never wears a series colour.
- Every chart is interactive (hover and keyboard focus show the values) and has a table view, so no value hides behind a tooltip.

## Motion

GSAP (`gsap` + `@gsap/react`), Lead Flow's rules:

- `useGSAP()` with a scope ref, never `useEffect`. Every animation has a `prefers-reduced-motion: reduce` branch that keeps fades and drops movement (`gsap.matchMedia()`).
- Curves: `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` (GSAP `power3.out`) for entering and leaving, `--ease-in-out` (`power3.inOut`) for moving on screen. Never `ease-in`.
- Animate only transform, opacity and clip-path.
- **Entrance** (`useDashboardMotion`): panels marked `data-rise` lift 28px and fade in, staggered 60ms. Figures marked by `<Count>` count up. Bars marked `data-bar-v` or `data-bar-h` grow from their baseline with a clip-path. Cards (`data-card`) and rows (`data-row`) arrive in sequence.
- **Shop switch**: figures count from the old shop's value to the new one, bars regrow, cards and rows arrive again, and `RollText` labels rise into place behind a mask.
- **Segmented highlight**: slides between options (0.4s, `power3.inOut`).
- **Voice**: the mic pulses with two rings while listening, the four pipeline steps light up in turn, the heard words rise in one by one, and the reply lifts in with its stage chip popping.
- Hover: 150ms (buttons scale up slightly, the ↗ arrow turns 45°).

## Example data

The dashboard shows `lib/demo.ts`: the same two made-up shops and history as the backend's `seed_demo`, with every balance, stock level, staff due and daily total derived from that history. The page says so in its footer. The voice panel plays each shop's example commands, with the backend's real replies to them.
