import { CartProvider } from "@/components/CartProvider";
import { MenuScreen } from "@/components/MenuScreen";

export default function Home() {
  return (
    <CartProvider>
      <MenuScreen />
    </CartProvider>
  );
}
