import { CartView } from "@/components/shop/cart-view";

export default function PanierPage() {
  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-xl font-semibold">Votre panier</h1>
      <CartView />
    </div>
  );
}
