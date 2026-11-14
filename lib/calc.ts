/** A shopkeeper's sum, such as "250*4 + 30", "₹1,200 + 18%" or "(500-50)/3", without eval.
 *  Returns the answer rounded to paise, or null when the text is not a sum (a name, one number, a bad sum). */
export function calculate(input: string): number | null {
  const text = input
    .replace(/[\s,₹]/g, "")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
  if (!/^[\d.+\-*/%()]+$/.test(text) || !/\d/.test(text)) return null

  let i = 0
  let binary = 0
  const peek = () => text[i]

  // A term that is only "<n>%" is a share of what it is added to or taken from: 200+10% = 220.
  type Term = { v: number; pct: boolean }

  const expr = (): number => {
    const first = term()
    let v = first.v
    while (peek() === "+" || peek() === "-") {
      const op = text[i++]
      binary++
      const t = term()
      const r = t.pct ? v * t.v : t.v
      v = op === "+" ? v + r : v - r
    }
    return v
  }

  const term = (): Term => {
    let t = unary()
    while (peek() === "*" || peek() === "/") {
      const op = text[i++]
      binary++
      const r = unary().v
      t = { v: op === "*" ? t.v * r : t.v / r, pct: false }
    }
    return t
  }

  const unary = (): Term => {
    if (peek() === "-") return (i++, { v: -unary().v, pct: false })
    if (peek() === "+") return (i++, unary())
    const v = primary()
    if (peek() === "%") return (i++, { v: v / 100, pct: true })
    return { v, pct: false }
  }

  const primary = (): number => {
    if (peek() === "(") {
      i++
      const v = expr()
      if (text[i++] !== ")") throw new Error("bracket")
      return v
    }
    const m = /^\d*\.?\d+|^\d+\./.exec(text.slice(i))
    if (!m) throw new Error("number")
    i += m[0].length
    return Number(m[0])
  }

  try {
    const v = expr()
    if (i !== text.length || binary === 0 || !Number.isFinite(v)) return null
    return Math.round(v * 100) / 100 || 0
  } catch {
    return null
  }
}
