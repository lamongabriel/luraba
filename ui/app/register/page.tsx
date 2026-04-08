import { AuthGate } from "@/components/auth/auth-gate";
import type { Metadata } from "next";

import { RegisterForm } from "@/components/forms/register-form";
import { Typography } from "@/components/ui/typography";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Create account",
  description: "Create an account to start managing your finances with Luraba.",
});

export default function RegisterPage() {
  return (
    <AuthGate mode="guest">
      <main className="flex min-h-dvh items-center justify-center px-4 py-8">
        <section className="w-full max-w-md space-y-5">
          <div className="space-y-2">
            <Typography variant="eyebrow" className="text-[0.72rem]">
              Create account
            </Typography>
            <Typography as="h2" variant="page-title" className="text-3xl md:text-3xl md:leading-none">
              Create your account.
            </Typography>
            <Typography variant="body-muted">
              Set up your account to get started.
            </Typography>
          </div>
          
          <RegisterForm />
        </section>
      </main>
    </AuthGate>
  );
}
