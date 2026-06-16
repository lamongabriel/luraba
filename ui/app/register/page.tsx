import type { Metadata } from "next";

import { AuthGate } from "@/components/auth/auth-gate";
import { RegisterForm } from "@/components/forms/register-form";
import { Typography } from "@/components/ui/typography";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Create account",
  description: "A visual-only registration screen for design iteration.",
});

export default function RegisterPage() {
  return (
    <AuthGate mode="guest">
      <main className="flex min-h-dvh items-center justify-center px-4 py-8">
        <section className="grid w-full max-w-5xl gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-center">
          <div className="space-y-4">
            <Typography variant="eyebrow">Create account</Typography>
            <Typography as="h1" variant="hero-title" className="text-4xl leading-none md:text-6xl">
              Craft the onboarding look before the workflow.
            </Typography>
            <Typography variant="body" className="max-w-xl text-foreground/72">
              Copy, field groups, and emphasis can evolve here without any schema or mutation code getting in the way.
            </Typography>
          </div>

          <RegisterForm />
        </section>
      </main>
    </AuthGate>
  );
}
