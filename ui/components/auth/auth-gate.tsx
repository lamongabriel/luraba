"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { useAuthStore } from "@/stores/auth.store";

interface AuthGateProps {  
  children: React.ReactNode;
  mode: "guest" | "protected";
}

export function AuthGate({ children, mode }: AuthGateProps) {
  const router = useRouter();
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  React.useEffect(() => {
    if (!isBootstrapped) return;

    if (mode === "protected" && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (mode === "guest" && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isBootstrapped, mode, router]);

  if (!isBootstrapped) {
    return <AuthLoadingScreen />;
  }

  if (mode === "protected" && !isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  if (mode === "guest" && isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
