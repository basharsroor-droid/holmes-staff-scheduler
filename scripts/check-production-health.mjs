const origin = (process.env.SHIFTPILOT_PRODUCTION_URL ?? "https://shiftpilot-demo-eight.vercel.app").replace(/\/$/, "");
const timeoutMs = 15_000;
const attempts = 3;

async function request(path) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${origin}${path}`, {
        headers: { "User-Agent": "ShiftPilot-Uptime-Monitor/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
  throw lastError;
}

async function check() {
  const startedAt = Date.now();
  const home = await request("/");
  if (home.headers.get("x-content-type-options") !== "nosniff") {
    throw new Error("Production security headers are missing");
  }

  const health = await request("/api/health");
  const healthBody = await health.json();
  if (healthBody.status !== "ok" || healthBody.service !== "shiftpilot") {
    throw new Error("Application health response is invalid");
  }

  const deepHealth = await request("/api/health?deep=1");
  const deepBody = await deepHealth.json();
  if (deepBody.status !== "ok" || deepBody.dependencies?.database !== "ok") {
    throw new Error("Supabase dependency health check failed");
  }

  console.log(JSON.stringify({
    status: "ok",
    origin,
    version: healthBody.version,
    database: deepBody.dependencies.database,
    duration_ms: Date.now() - startedAt,
    checked_at: new Date().toISOString()
  }));
}

check().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    origin,
    message: error instanceof Error ? error.message : "Unknown monitoring failure",
    checked_at: new Date().toISOString()
  }));
  process.exit(1);
});
