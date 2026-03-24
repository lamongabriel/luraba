import { useAppMutation } from "@/lib/mutations";
import { register } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import type { RegisterHttpParams } from "@/interfaces/http/auth";

export const useRegisterMutation = () => {
  const loginStore = useAuthStore((state) => state.login);

  return useAppMutation<Awaited<ReturnType<typeof register>>, RegisterHttpParams>({
    mutationFn: register,
    onSuccess: (data) => {
      loginStore(data.user, data.accessToken);
    },
  });
};
