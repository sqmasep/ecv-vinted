export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-muted/30 flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      {children}
    </main>
  );
}
