"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { revokeMcpConnection } from "@/services/mcp.service";

export const revokeMcpConnectionMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't revoke this agent. Please try again.",
  mutationFn: revokeMcpConnection,
  mutationKey: ["mcp", "revoke"],
});
export function useRevokeMcpConnectionMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(revokeMcpConnectionMutationDefinition, options);
}
