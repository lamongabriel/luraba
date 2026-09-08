import { ErrorState } from "@/components/error-state";

export function TransactionsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState title="Couldn’t load transactions" description={message} onRetry={onRetry} />;
}
