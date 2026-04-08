import { AuthGate } from "@/components/auth/auth-gate";
import type { Metadata } from "next";

import { LoginForm } from "@/components/forms/login-form";
import { Typography } from "@/components/ui/typography";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Sign in",
  description: "Sign in to access your accounts, budgets, and transactions.",
});

export default function LoginPage() {
  return (
    <AuthGate mode="guest">
      <main className="flex min-h-dvh items-center justify-center px-4 py-8">
        <section className="w-full max-w-md space-y-5">
          <div className="space-y-2">
            <Typography variant="eyebrow" className="text-[0.72rem]">
              Sign in
            </Typography>
            <Typography as="h2" variant="page-title" className="text-3xl md:text-3xl md:leading-none">
              Welcome back.
            </Typography>
            <Typography variant="body-muted">
              Enter your email and password to continue.
            </Typography>
          </div>
          
          <LoginForm />
        </section>
      </main>
    </AuthGate>
  );
}
