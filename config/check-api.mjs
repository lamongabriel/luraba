const response = await fetch("http://127.0.0.1:8080/health", {
  signal: AbortSignal.timeout(8_000),
});
const report = await response.json().catch(() => ({}));
const dbReady = report?.services?.db?.status === "up";
if (!response.ok || !dbReady || report?.services?.api?.status !== "up") {
  process.exit(1);
}
// FX providers are optional for local development. A 200 degraded response is healthy here.
process.exit(0);
