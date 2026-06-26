"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import type { SignInEmailHttpBody } from "@/interfaces/http/auth-http"
import { hydrateAuthenticatedSession } from "@/services/auth-session.service"
import { useLoginMutation } from "@/mutations/auth/use-login-mutation"
import { useAuthSessionStore } from "@/stores/auth-session-store"

import { loginFormSchema, type LoginFormValues } from "./login-form-schema"

export function useLoginForm() {
  const router = useRouter()
  const hydrate = useAuthSessionStore((state) => state.hydrate)
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginFormSchema),
  })

  const loginMutation = useLoginMutation({
    onSuccess: async () => {
      await hydrateAuthenticatedSession({
        hydrate,
      })

      router.replace("/dashboard")
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    const body: SignInEmailHttpBody = {
      email: values.email,
      password: values.password,
    }

    loginMutation.reset()
    loginMutation.mutate(body)
  })

  return {
    form,
    loginMutation,
    onSubmit,
  }
}
