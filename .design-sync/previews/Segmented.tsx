import { useState } from "react"
import { Segmented } from "frontend"

export const Filter = () => {
  const [value, setValue] = useState("all")
  return (
    <Segmented label="Customers filter" value={value} onChange={setValue} className="bg-card p-1"
      options={[{ value: "all", label: "Sab" }, { value: "due", label: "Baaki wale" }, { value: "settled", label: "Chukta" }]} />
  )
}

export const OnWhite = () => {
  const [value, setValue] = useState("gupta")
  return (
    <div style={{ background: "#fff", borderRadius: 9999, padding: 6, display: "inline-flex" }}>
      <Segmented label="Dukaan chuniye" surface="light" value={value} onChange={setValue}
        options={[{ value: "gupta", label: "Gupta General Store" }, { value: "patel", label: "Patel Provision Store" }]} />
    </div>
  )
}

export const Small = () => {
  const [value, setValue] = useState("chart")
  return (
    <Segmented label="Chart or table" value={value} onChange={setValue} className="bg-canvas p-1" itemClassName="px-3 py-1 text-xs"
      options={[{ value: "chart", label: "Chart" }, { value: "table", label: "Table" }]} />
  )
}
