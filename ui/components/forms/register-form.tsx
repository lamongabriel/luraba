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
import { useRegisterMutation } from "@/queries/use-register.mutation";
import { registerSchema, type RegisterFormData } from "@/schemas/auth.schemas";

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegisterMutation();

  const form = useForm<RegisterFormData>({
    resolver: zodFormResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await registerMutation.mutateAsync({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    router.push("/dashboard");
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[1.6rem] border border-border/70 bg-[var(--color-container)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text" placeholder="Your name" {...form.register("name")} />
        {form.formState.errors.name ? (
          <Typography variant="small" className="text-destructive">
            {form.formState.errors.name.message}
          </Typography>
        ) : null}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="********"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword ? (
          <Typography variant="small" className="text-destructive">
            {form.formState.errors.confirmPassword.message}
          </Typography>
        ) : null}
      </div>

      <FormErrorBoundary error={registerMutation.error} />

      <Button type="submit" className="h-10 w-full rounded-xl" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? "Creating account..." : "Create account"}
      </Button>

      <Typography as="p" variant="body-muted" className="text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </Typography>
    </form>
  );
}
