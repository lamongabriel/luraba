"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/mutations";
import { updatePreferences } from "@/services/preferences.service";
import { useAuthStore } from "@/stores/auth.store";
import type { UpdatePreferencesHttpParams } from "@/interfaces/http/preferences";

export const useUpdatePreferencesMutation = () => {
  const queryClient = useQueryClient();
  const updateUserPreferences = useAuthStore((state) => state.updateUserPreferences);

  return useAppMutation<Awaited<ReturnType<typeof updatePreferences>>, UpdatePreferencesHttpParams>({
    mutationFn: updatePreferences,
    onSuccess: (data) => {
      updateUserPreferences(data);
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });
};
