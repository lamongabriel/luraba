const response = await fetch("http://127.0.0.1:29670/login", {
  signal: AbortSignal.timeout(8_000),
});
if (!response.ok || response.status >= 500) process.exit(1);
process.exit(0);
