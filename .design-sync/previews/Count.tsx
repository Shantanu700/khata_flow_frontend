import { Count, demo } from "frontend"

export const Figures = () => (
  <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
    <span className="text-6xl leading-none font-light"><Count id="outstanding" value={demo.shopView("gupta").outstanding} /></span>
    <span className="text-4xl leading-none font-light"><Count id="low" value={3} format="int" /></span>
  </div>
)
