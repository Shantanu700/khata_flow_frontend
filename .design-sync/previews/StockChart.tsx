import { StockChart, demo } from "frontend"

export const GuptaStore = () => <div style={{ maxWidth: 620 }}><StockChart products={demo.shopView("gupta").products} /></div>
export const PatelStore = () => <div style={{ maxWidth: 620 }}><StockChart products={demo.shopView("patel").products} /></div>
