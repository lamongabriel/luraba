"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { NoActiveHouseholdState } from "@/components/households/no-active-household-state";
import { Loader } from "@/components/ui/loader";
import { logout } from "@/lib/auth/logout";
import {
  useCurrentUserQuery,
  useProbeCurrentUserQuery,
} from "@/queries/auth/use-current-user-query";
import {
  useHouseholdsQuery,
  useProbeHouseholdsQuery,
} from "@/queries/households/use-households-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

interface AuthGateProps {
  children: React.ReactNode;
  mode?: "guest" | "protected";
}

export function AuthGate({ children, mode = "protected" }: AuthGateProps) {
  const router = useRouter();
  const hydrate = useAuthSessionStore((state) => state.hydrate);
  const clear = useAuthSessionStore((state) => state.clear);
  const setBootstrapStatus = useAuthSessionStore((state) => state.setBootstrapStatus);

  const protectedSessionQuery = useCurrentUserQuery({
    enabled: mode !== "guest",
  });
  const guestSessionQuery = useProbeCurrentUserQuery({
    enabled: mode === "guest",
  });
  const sessionQuery = mode === "guest" ? guestSessionQuery : protectedSessionQuery;

  const protectedHouseholdsQuery = useHouseholdsQuery(
    {},
    { enabled: mode !== "guest" && Boolean(protectedSessionQuery.data) },
  );
  const guestHouseholdsQuery = useProbeHouseholdsQuery(
    {},
    { enabled: mode === "guest" && Boolean(guestSessionQuery.data) },
  );
  const householdsQuery = mode === "guest" ? guestHouseholdsQuery : protectedHouseholdsQuery;

  const isPending =
    sessionQuery.isPending || (Boolean(sessionQuery.data) && householdsQuery.isPending);

  React.useEffect(() => {
    if (isPending) {
      setBootstrapStatus("loading");
      return;
    }

    if (sessionQuery.data && householdsQuery.data) {
      hydrate(sessionQuery.data, householdsQuery.data.data);
      return;
    }

    if (mode === "guest") {
      clear();
      return;
    }

    if (sessionQuery.isError) {
      void logout();
      return;
    }

    setBootstrapStatus("anonymous");
  }, [
    clear,
    hydrate,
    householdsQuery.data,
    isPending,
    mode,
    sessionQuery.data,
    sessionQuery.isError,
    setBootstrapStatus,
  ]);

  React.useEffect(() => {
    if (mode === "guest" && sessionQuery.data && householdsQuery.data) {
      router.replace("/dashboard");
    }
  }, [householdsQuery.data, mode, router, sessionQuery.data]);

  if (mode === "guest") {
    if (sessionQuery.data && householdsQuery.isPending) {
      return <Loader fullPage size="lg" />;
    }

    if (sessionQuery.data && householdsQuery.data) {
      return <Loader fullPage size="lg" />;
    }

    return <>{children}</>;
  }

  if (isPending) {
    return <Loader fullPage size="lg" />;
  }

  if (!sessionQuery.data || !householdsQuery.data) {
    return <Loader fullPage size="lg" />;
  }

  if (!sessionQuery.data.household) {
    return <NoActiveHouseholdState />;
  }

  return <>{children}</>;
}
