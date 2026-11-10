import { ChartCard, DataTable, format, demo } from "frontend"

const due = demo.shopView("gupta").customers.filter((c) => c.balance > 0)
const max = Math.max(...due.map((c) => c.balance))

export const RankedBars = () => (
  <div style={{ maxWidth: 560 }}>
    <ChartCard
      title="Sabse zyada baaki"
      qualifier={`${due.length} customers, biggest first`}
      table={<DataTable head={["Customer", "Baaki"]} rows={due.map((c) => [c.name, format.inr(c.balance)])} />}
    >
      <ul style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0, padding: 0, listStyle: "none" }}>
        {due.map((c) => (
          <li key={c.name} style={{ display: "grid", gridTemplateColumns: "7rem 1fr auto", alignItems: "center", gap: 12, fontSize: 14 }}>
            <span>{c.name}</span>
            <span className="bg-chart-single" style={{ height: 12, width: `${(c.balance / max) * 100}%`, borderRadius: "0 4px 4px 0" }} />
            <span className="text-muted-foreground" style={{ fontSize: 12 }}>{format.inr(c.balance)}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  </div>
)
