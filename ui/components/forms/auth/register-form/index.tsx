"use client"

import Link from "next/link"

import { AuthFormFrame } from "@/components/forms/auth/auth-form-frame"
import { FormItem } from "@/components/forms/form-item"
import { SocialAuthButtons } from "@/components/forms/social-auth-buttons"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"

import { useRegisterForm } from "./use-register-form"

export function RegisterForm() {
  const { form, registerMutation, onSubmit } = useRegisterForm()

  return (
    <AuthFormFrame
      footer={
        <>
          Already set up?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <FormItem
          control={form.control}
          name="name"
          label="Name"
          placeholder="Your name"
          autoComplete="name"
          inputClassName="h-10 rounded-xl"
        />

        <FormItem
          control={form.control}
          name="email"
          label="Email"
          placeholder="you@example.com"
          inputType="email"
          autoComplete="email"
          inputClassName="h-10 rounded-xl"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormItem
            control={form.control}
            name="password"
            label="Password"
            placeholder="Create a password"
            inputType="password"
            autoComplete="new-password"
            inputClassName="h-10 rounded-xl"
          />

          <FormItem
            control={form.control}
            name="confirmPassword"
            label="Confirm Password"
            placeholder="Repeat password"
            inputType="password"
            autoComplete="new-password"
            inputClassName="h-10 rounded-xl"
          />
        </div>

        {registerMutation.errorMessage ? (
          <Typography variant="small-destructive">
            {registerMutation.errorMessage}
          </Typography>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="h-10 w-full rounded-xl border-primary/30 bg-primary text-primary-foreground shadow-none hover:brightness-105"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <SocialAuthButtons mode="register" />
    </AuthFormFrame>
  )
}
