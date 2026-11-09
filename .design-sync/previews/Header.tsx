import { useState } from "react"
import { Header, demo } from "frontend"

export const Default = () => {
  const [shopId, setShopId] = useState<"gupta" | "patel">("gupta")
  return <Header shops={demo.SHOP_IDS.map((id) => demo.shopView(id))} shopId={shopId} onShop={setShopId} />
}
