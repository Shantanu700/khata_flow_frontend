// Compiles the app's Tailwind stylesheet (tokens included) for the design-sync bundle.
// Run from the frontend root: bun .design-sync/build-css.mjs
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import { mkdirSync, writeFileSync } from "node:fs"

const input = `@import "../app/globals.css";
@source "../components";
@source "./previews";
@source "./entry.tsx";
@source inline("bg-heat-{1,2,3,4,5}");
:root { --font-urbanist: "Urbanist", system-ui, sans-serif; }
/* The app paints a black bezel on <html>; inside designs and cards the canvas reaches the edges. */
html { background-color: var(--canvas); }
`
const result = await postcss([tailwind({ base: process.cwd() })]).process(input, { from: `${process.cwd()}/.design-sync/input.css` })
mkdirSync(".design-sync/.cache", { recursive: true })
writeFileSync(".design-sync/.cache/ds.css", result.css)
console.log(`.design-sync/.cache/ds.css: ${result.css.length} bytes`)
