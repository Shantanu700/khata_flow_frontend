import { DebtorCard, demo } from "frontend"

const customers = demo.shopView("gupta").customers

function List({ children }: { children: React.ReactNode }) {
  return <ul style={{ display: "grid", gap: 10, margin: 0, padding: 0, listStyle: "none", maxWidth: 300 }}>{children}</ul>
}

export const Highlighted = () => <List><DebtorCard customer={customers[0]} highlight /></List>
export const Ordinary = () => <List><DebtorCard customer={customers[1]} highlight={false} /></List>
export const Settled = () => <List><DebtorCard customer={customers[3]} highlight={false} /></List>
