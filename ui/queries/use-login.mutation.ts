import { useAppMutation } from "@/lib/mutations";
import { login } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import type { LoginHttpParams } from "@/interfaces/http/auth";

export const useLoginMutation = () => {
  const loginStore = useAuthStore((state) => state.login);

  return useAppMutation<Awaited<ReturnType<typeof login>>, LoginHttpParams>({
    mutationFn: login,
    onSuccess: (data) => {
      loginStore(data.user, data.accessToken);
    },
  });
};
