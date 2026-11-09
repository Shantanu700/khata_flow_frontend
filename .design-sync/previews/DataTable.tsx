import { DataTable, format, demo } from "frontend"

export const Customers = () => (
  <div className="bg-card" style={{ maxWidth: 520, borderRadius: 32, padding: 24 }}>
    <DataTable
      head={["Customer", "Diya", "Mila", "Baaki"]}
      rows={demo.shopView("gupta").customers.map((c) => [c.name, format.inr(c.given), format.inr(c.paid), format.inr(c.balance)])}
    />
  </div>
)
