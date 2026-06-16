import type { Metadata } from "next";

import { AuthGate } from "@/components/auth/auth-gate";
import { LoginForm } from "@/components/forms/login-form";
import { Typography } from "@/components/ui/typography";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Sign in",
  description: "A visual-only sign-in surface for refining layout, copy, and spacing.",
});

export default function LoginPage() {
  return (
    <AuthGate mode="guest">
      <main className="flex min-h-dvh items-center justify-center px-4 py-8">
        <section className="grid w-full max-w-5xl gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-center">
          <div className="space-y-4">
            <Typography variant="eyebrow">Sign in</Typography>
            <Typography as="h1" variant="hero-title" className="text-4xl leading-none md:text-6xl">
              Welcome back to the preview workspace.
            </Typography>
            <Typography variant="body" className="max-w-xl text-foreground/72">
              The interaction logic has been removed on purpose, so this screen is free to become a polished entry
              experience before we wire behavior back in.
            </Typography>
          </div>

          <LoginForm />
        </section>
      </main>
    </AuthGate>
  );
}
