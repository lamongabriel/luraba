export function AuthLoadingScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border border-border/70 border-t-primary"
      />
      <span className="sr-only">Loading</span>
    </main>
  );
}
