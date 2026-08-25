import type { Metadata } from "next"

import { AuthPageHeader } from "@/components/auth/auth-page-header"
import { LoginForm } from "@/components/forms/auth/login-form"
import { FormErrorBoundary } from "@/components/forms/form-error-boundary"
import { createPageMetadata } from "@/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Sign in",
  description: "Sign in to access your Luraba workspace.",
})

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.03),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.015),transparent_24%,transparent_76%,rgba(255,255,255,0.01))]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      </div>

      <section className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[29rem] items-center justify-center">
        <div className="w-full space-y-6">
          <AuthPageHeader
            eyebrow="Welcome back"
            title="Sign in to Luraba"
            description="Continue to your workspace."
          />

          <FormErrorBoundary>
            <LoginForm />
          </FormErrorBoundary>
        </div>
      </section>
    </main>
  )
}
