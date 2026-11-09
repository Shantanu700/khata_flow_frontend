import { Notch } from "frontend"

function Card({ corner, highlight, title, sub }: { corner: "tr" | "bl"; highlight?: boolean; title: string; sub: string }) {
  return (
    <div className={highlight ? "bg-lime text-black" : "bg-card"} style={{ position: "relative", width: 260, height: 170, borderRadius: 32, padding: 20, boxSizing: "border-box" }}>
      <p style={{ margin: 0, fontSize: 20 }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.7 }}>{sub}</p>
      <Notch corner={corner} r={22} gap={6}>
        <button type="button" aria-label="Kholo" className="bg-card text-foreground" style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 9999, border: 0 }}>
          ↗
        </button>
      </Notch>
    </div>
  )
}

export const TopRight = () => <Card corner="tr" highlight title="Sharma ji" sub="Baaki ₹1,250" />
export const OnSurface = () => <Card corner="tr" title="Verma ji" sub="Baaki ₹700" />
export const BottomLeft = () => <Card corner="bl" title="Gupta aunty" sub="Baaki ₹550" />
