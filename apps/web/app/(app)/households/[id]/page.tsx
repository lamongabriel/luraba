"use client";

import { useParams } from "next/navigation";

import { HouseholdManagement } from "@/components/households/household-management";

export default function HouseholdManagementPage() {
  const params = useParams<{ id: string }>();
  return <HouseholdManagement householdId={params.id} />;
}
