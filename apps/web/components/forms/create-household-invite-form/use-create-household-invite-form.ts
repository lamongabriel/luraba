"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { CreateHouseholdInviteInput } from "@luraba/contracts"
import { useForm } from "react-hook-form"

import {
  type CreateHouseholdInviteFormValues,
  createHouseholdInviteFormSchema,
} from "./create-household-invite-form.schema"

export function useCreateHouseholdInviteForm({
  onSubmit,
}: {
  onSubmit: (body: CreateHouseholdInviteInput) => void
}) {
  const form = useForm<CreateHouseholdInviteFormValues>({
    defaultValues: { email: "", role: "member" },
    resolver: zodResolver(createHouseholdInviteFormSchema),
    mode: "onBlur",
  })

  const submit = form.handleSubmit((values) =>
    onSubmit({ email: values.email.trim().toLowerCase(), role: values.role }),
  )

  return { form, submit }
}
