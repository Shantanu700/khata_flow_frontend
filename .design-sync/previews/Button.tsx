import { Button } from "frontend"

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
    <Button>Entry likho</Button>
    <Button variant="secondary">Khata kholo</Button>
    <Button variant="outline">Table dekho</Button>
    <Button variant="ghost">Baad mein</Button>
    <Button variant="destructive">Entry hatao</Button>
    <Button variant="link">Sab entries</Button>
  </div>
)

export const Sizes = () => (
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    <Button size="sm">Chhota</Button>
    <Button>Default</Button>
    <Button size="lg">Bada</Button>
  </div>
)

export const Disabled = () => <Button disabled>Band hai</Button>
