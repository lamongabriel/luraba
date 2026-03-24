import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <section className="w-full space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl">Create Account</h1>
          <p className="text-sm text-muted-foreground">Register to access your Luraba workspace.</p>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}
