const response = await fetch("http://127.0.0.1:3000/login", { signal: AbortSignal.timeout(8_000) });
if (!response.ok || response.status >= 500) process.exit(1);
process.exit(0);
