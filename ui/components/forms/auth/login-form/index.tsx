"use client"

import Link from "next/link"

import { AuthFormFrame } from "@/components/forms/auth/auth-form-frame"
import { FormItem } from "@/components/forms/form-item"
import { SocialAuthButtons } from "@/components/forms/social-auth-buttons"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"

import { useLoginForm } from "./use-login-form"

export function LoginForm() {
  const { form, loginMutation, onSubmit } = useLoginForm()

  return (
    <AuthFormFrame
      footer={
        <>
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <FormItem
          control={form.control}
          name="email"
          label="Email"
          placeholder="you@example.com"
          inputType="email"
          autoComplete="email"
        />

        <FormItem
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter your password"
          inputType="password"
          autoComplete="current-password"
        />

        {loginMutation.errorMessage ? (
          <Typography variant="small-destructive">
            {loginMutation.errorMessage}
          </Typography>
        ) : null}

        <Button
          type="submit"
          isLoading={loginMutation.isPending}
          loadingText="Signing in..."
          size="lg"
          className="h-10 w-full"
        >
          Continue
        </Button>
      </form>

      <SocialAuthButtons mode="login" />
    </AuthFormFrame>
  )
}
