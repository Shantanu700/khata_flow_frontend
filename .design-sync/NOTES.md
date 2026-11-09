# design-sync notes (KhaataFlow frontend)

- The repo is a Next.js app, not a package: there is no dist. The converter builds from `.design-sync/entry.tsx`, which exports exactly the 19 synced components, `demo`, `format` and `KhaataFlowRoot`. Add a component there and to `componentSrcMap`.
- Build: `bun .design-sync/build-css.mjs` (compiles `app/globals.css` with Tailwind v4 into `.design-sync/.cache/ds.css`), then `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/entry.tsx --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`.
- `srcDir` is `components/dashboard` on purpose: with `components`, everything in the dashboard folder groups as "dashboard" and the docs' `category` is ignored.
- The sync CSS paints `html` with `var(--canvas)`; the app's own `html` is black (its bezel). Without it every card shows a black slab under the story.
- `@source inline("bg-heat-{1,2,3,4,5}")` keeps the whole heat scale in the CSS because the conventions header names it; no component uses heat-2 or heat-4 as a class.
- Render check runs on playwright 1.62.1, which pins the cached Chromium 1234 (`~/Library/Caches/ms-playwright`). Install that version into `.ds-sync/` on a fresh clone.
- Captures freeze the clock at 15 May, so staff dues in cards differ from today's; the demo data follows "today" by design.

## Re-sync risks
- Previews and docs are hand-written from the components' current props; a prop rename breaks the preview build (the component falls back to the floor card).
- `.design-sync/docs/*.md` are copies of the guideline text; edit them there, not in the uploaded `.prompt.md`.
- The conventions header names Tailwind classes; re-run its validation (grep each class in `ds-bundle/_ds_bundle.css`) after any styling change.
- Urbanist ships as a file (OFL, in `.design-sync/fonts/`); the rupee sign comes from the system fallback, because Urbanist has no ₹ glyph.
