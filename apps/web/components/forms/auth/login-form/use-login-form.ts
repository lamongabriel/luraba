"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { apiConfig } from "@/config/api";
import { safeNext } from "@/lib/safe-next";
import { useLoginMutation } from "@/mutations/auth/use-login-mutation";
import type { SignInEmailInput } from "@/services/auth-sdk.types";
import { hydrateAuthenticatedSession } from "@/services/auth-session.service";
import { useAuthSessionStore } from "@/stores/auth-session-store";

import { type LoginFormValues, loginFormSchema } from "./login-form-schema";

export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrate = useAuthSessionStore((state) => state.hydrate);
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginFormSchema),
  });

  const loginMutation = useLoginMutation({
    onSuccess: async () => {
      await hydrateAuthenticatedSession({
        hydrate,
      });

      const next = safeNext(searchParams.get("next"), apiConfig.origin);
      if (next?.startsWith("/")) router.replace(next);
      // An agent connecting: the API continues the OAuth flow (consent screen) from here.
      else if (next) window.location.assign(next);
      else router.replace("/dashboard");
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const body: SignInEmailInput = {
      email: values.email,
      password: values.password,
    };

    loginMutation.reset();
    loginMutation.mutate(body);
  });

  return {
    form,
    loginMutation,
    onSubmit,
  };
}
