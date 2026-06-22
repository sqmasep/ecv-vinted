import { UserMenu } from "@/components/auth/user-menu";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">Web</span>
        <UserMenu />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
        <p className="text-muted-foreground max-w-md">
          Sign in or create an account from the top-right menu. Auth is shared
          across every app through the API.
        </p>
      </main>
    </div>
  );
}
