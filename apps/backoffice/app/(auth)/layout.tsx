import { EcrinLogo } from "@/components/brand/ecrin-logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background p-6">
      <EcrinLogo />
      {children}
    </main>
  );
}
