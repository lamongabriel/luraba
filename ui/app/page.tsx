"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { useAuthStore } from "@/stores/auth.store";

export default function Page() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  React.useEffect(() => {
    if (!isBootstrapped) return;
    
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, isBootstrapped, router]);

  if (!isBootstrapped) {
    return <AuthLoadingScreen />;
  }

  return <AuthLoadingScreen />;
}
