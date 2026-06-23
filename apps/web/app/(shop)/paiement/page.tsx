import { PaymentForm } from "@/components/shop/payment-form";

export default function PaiementPage() {
  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-xl font-semibold">Paiement sécurisé</h1>
      <PaymentForm />
    </div>
  );
}
