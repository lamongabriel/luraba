import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { ApiError, NetworkError } from "@/lib/errors";

export function useAppMutation<TData, TVariables = void>(
  options: Omit<UseMutationOptions<TData, ApiError | NetworkError, TVariables>, "onError"> & {
    onError?: (
      error: ApiError | NetworkError,
      variables: TVariables,
      context: unknown,
    ) => void;
  },
) {
  const { onError: customOnError, ...restOptions } = options;

  return useMutation<TData, ApiError | NetworkError, TVariables>({
    ...restOptions,
    onError: (error, variables, context) => {
      if (error instanceof NetworkError) {
        console.error(error.message);
      } else if (error instanceof ApiError && error.isUnexpectedError()) {
        console.error(error.message);
      }

      customOnError?.(error, variables, context);
    },
  });
}
