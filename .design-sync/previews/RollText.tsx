import { useState } from "react"
import { Button, RollText } from "frontend"

const names = ["Gupta General Store", "Patel Provision Store"]

export const SwitchShop = () => {
  const [i, setI] = useState(0)
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Button variant="secondary" onClick={() => setI(1 - i)}>Dukaan badlo</Button>
      <span style={{ fontSize: 24 }}><RollText rollKey={String(i)}>{names[i]}</RollText></span>
    </div>
  )
}
