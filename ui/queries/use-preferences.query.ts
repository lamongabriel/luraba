"use client";

import { useQuery } from "@tanstack/react-query";
import { getPreferences } from "@/services/preferences.service";

export const usePreferencesQuery = () => {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: getPreferences,
  });
};
