// Run: bun lib/calc.check.ts
import { strict as assert } from "node:assert"

import { calculate } from "./calc"

const cases: [string, number | null][] = [
  ["250*4+30", 1030],
  ["250 × 4 + 30", 1030],
  ["250x4", 1000],
  ["₹1,200 + 18%", 1416],
  ["1200*18%", 216],
  ["1000-10%", 900],
  ["(500-50)/3", 150],
  ["100/3", 33.33],
  ["0.1+0.2", 0.3],
  ["-50+20", -30],
  ["2*(3+4)", 14],
  ["10/0", null],
  ["500", null],
  ["-500", null],
  ["Sharma ji", null],
  ["2+", null],
  ["(2+3", null],
  ["2..3+1", null],
  ["", null],
]
for (const [input, want] of cases) assert.equal(calculate(input), want, input)
console.log(`calc: ${cases.length} cases pass`)
