## KhaataFlow conventions

**Wrap every screen in `KhaataFlowRoot`.** It is the app's `<html class="dark">` on the canvas colour: without it the shadcn `dark:` styles and the page background are missing.

```jsx
const { KhaataFlowRoot, Header, Hero, Debtors, MoneyChart, demo } = window.KhaataFlow
const shop = demo.shopView("gupta") // example data: "gupta" or "patel"
<KhaataFlowRoot>
  <div className="flex flex-col gap-8">
    <Hero view={shop} onSpeak={() => {}} />
    <Debtors customers={shop.customers} />
    <div className="grid gap-panel lg:grid-cols-2">
      <MoneyChart days={shop.days} />
      <div className="rounded-xl bg-card p-6">Your own panel</div>
    </div>
  </div>
</KhaataFlowRoot>
```

**Styling idiom: Tailwind utilities over CSS-variable tokens.** Only classes the components already use exist in `styles.css`, so reuse these:
- Surfaces: `bg-background` (canvas #1a1a1a), `bg-card` (#2e2e2e), `bg-raised` / `bg-secondary` (#434343), `bg-paper` (#e5e5e5, black text), `bg-black`, `bg-white`.
- Accent and status: `bg-lime` (black text only), `bg-cyan`, `bg-red`, `text-red-ink`, `bg-heat-1` … `bg-heat-5`.
- Text: `text-foreground`, `text-muted-foreground`, `text-black`.
- Charts: `bg-udhaar` (credit given), `bg-vasooli` (payment), `bg-chart-single`, `bg-chart-quiet`, `bg-chart-grid`.
- Shape and space: `rounded-xl` (32px cards), `rounded-lg`, `rounded-md`, `rounded-full` (every control), `gap-panel` (10px between cards), `gap-8` between sections, `p-6` card padding.
- Type: `font-light` for big figures, `text-6xl` hero figure, `text-xl` card titles with a `text-sm text-muted-foreground` second line.
For anything else use the tokens directly: `style={{ background: "var(--surface)", color: "var(--ink-muted)" }}`.

**Rules that keep it on-brand:** lime only for the one primary thing per view, always with black text; Hinglish copy ("Udhaar wale", "Bolke likho"); money through `KhaataFlow.format.inr` (₹1,25,000); udhaar is always orange (`bg-udhaar`) and vasooli teal (`bg-vasooli`); dark only.

**Where the truth lives:** `styles.css` (tokens and every utility class) and each component's `.prompt.md`.
