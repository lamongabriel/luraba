import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <section className="w-full space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl">Login</h1>
          <p className="text-sm text-muted-foreground">Access your Luraba workspace.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
