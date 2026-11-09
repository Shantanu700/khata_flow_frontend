import { MoneyChart, demo } from "frontend"

export const GuptaStore = () => <div style={{ maxWidth: 620 }}><MoneyChart days={demo.shopView("gupta").days} /></div>
export const PatelStore = () => <div style={{ maxWidth: 620 }}><MoneyChart days={demo.shopView("patel").days} /></div>
