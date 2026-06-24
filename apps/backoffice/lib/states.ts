import {
  CheckCircle2,
  Clock,
  FlaskConical,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// Variante de Badge (cf. components/ui/badge). La couleur n'est qu'un indice
// SECONDAIRE : chaque état porte aussi un libellé + une icône (forme) pour
// rester lisible sans la couleur (RGAA / WCAG — pas d'info par la couleur seule).
export type StateVariant =
  | "default"
  | "secondary"
  | "outline"
  | "gold"
  | "success"
  | "destructive";

export type StateMeta = {
  label: string;
  icon: LucideIcon;
  variant: StateVariant;
};

// Vocabulaire canonique @repo/schemas STATES → présentation FR du back-office.
export const STATE_META: Record<string, StateMeta> = {
  listed: { label: "En vente", icon: Tag, variant: "outline" },
  sold_awaiting_shipment: { label: "Vendue", icon: ShoppingBag, variant: "secondary" },
  received_at_hub: { label: "Reçue au hub", icon: PackageCheck, variant: "secondary" },
  authentication_in_progress: { label: "Expertise en cours", icon: Search, variant: "gold" },
  lab_analysis: { label: "Analyse labo", icon: FlaskConical, variant: "gold" },
  authenticated: { label: "Authentifiée", icon: ShieldCheck, variant: "success" },
  shipped: { label: "Expédiée", icon: Truck, variant: "default" },
  delivered: { label: "Livrée", icon: CheckCircle2, variant: "success" },
  rejected: { label: "Refusée", icon: XCircle, variant: "destructive" },
};

const FALLBACK: StateMeta = { label: "—", icon: Clock, variant: "outline" };

export function stateMeta(state: string): StateMeta {
  return STATE_META[state] ?? { ...FALLBACK, label: state };
}
