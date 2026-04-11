"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { zodFormResolver } from "@/lib/zod-form-resolver";
import { useLoginMutation } from "@/queries/use-login.mutation";
import { loginSchema, type LoginFormData } from "@/schemas/auth.schemas";

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormData>({
    resolver: zodFormResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
    router.push("/dashboard");
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[1.6rem] border border-border/70 bg-[var(--color-container)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...form.register("email")} />
        {form.formState.errors.email ? (
          <Typography variant="small" className="text-destructive">
            {form.formState.errors.email.message}
          </Typography>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="********" {...form.register("password")} />
        {form.formState.errors.password ? (
          <Typography variant="small" className="text-destructive">
            {form.formState.errors.password.message}
          </Typography>
        ) : null}
      </div>

      <FormErrorBoundary error={loginMutation.error} />

      <Button type="submit" className="h-10 w-full rounded-xl" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? "Signing in..." : "Sign in"}
      </Button>

      <Typography as="p" variant="body-muted" className="text-center">
        Need an account?{" "}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          Create one
        </Link>
      </Typography>
    </form>
  );
}
