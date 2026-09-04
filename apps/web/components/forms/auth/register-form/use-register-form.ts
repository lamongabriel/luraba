"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { useRegisterMutation } from "@/mutations/auth/use-register-mutation"
import type { SignUpEmailInput } from "@/services/auth-sdk.types"
import { hydrateAuthenticatedSession } from "@/services/auth-session.service"
import { useAuthSessionStore } from "@/stores/auth-session-store"

import {
  type RegisterFormValues,
  registerFormSchema,
} from "./register-form-schema"

export function useRegisterForm() {
  const router = useRouter()
  const hydrate = useAuthSessionStore((state) => state.hydrate)
  const form = useForm<RegisterFormValues>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: "",
    },
    resolver: zodResolver(registerFormSchema),
  })

  const registerMutation = useRegisterMutation({
    onSuccess: async () => {
      await hydrateAuthenticatedSession({
        hydrate,
      })

      router.replace("/dashboard")
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    const body: SignUpEmailInput = {
      email: values.email,
      name: values.name,
      password: values.password,
    }

    registerMutation.reset()
    registerMutation.mutate(body)
  })

  return {
    form,
    registerMutation,
    onSubmit,
  }
}
