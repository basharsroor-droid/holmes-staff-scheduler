const origin = (process.env.SHIFTPILOT_PRODUCTION_URL ?? "https://shiftpilothq.com").replace(/\/$/, "");
const timeoutMs = 15_000;

async function request(path, options = {}) {
  return fetch(`${origin}${path}`, {
    headers: { "User-Agent": "ShiftPilot-Pilot-Readiness/1.0", ...(options.headers ?? {}) },
    redirect: options.redirect ?? "follow",
    signal: AbortSignal.timeout(timeoutMs)
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkProtectedRoute(path) {
  const response = await request(path, { redirect: "manual" });
  assert([301, 302, 303, 307, 308].includes(response.status), `${path} did not fail closed (HTTP ${response.status})`);
  const location = response.headers.get("location") ?? "";
  assert(location === "/login" || location.startsWith("/login?") || location.includes("/login"), `${path} redirected somewhere unexpected: ${location || "missing location"}`);
  return { path, status: response.status, location };
}

async function check() {
  const startedAt = Date.now();
  const home = await request("/");
  assert(home.ok, `Homepage returned HTTP ${home.status}`);
  assert(home.headers.get("x-content-type-options") === "nosniff", "x-content-type-options header missing");
  assert(Boolean(home.headers.get("content-security-policy")), "content-security-policy header missing");
  assert(Boolean(home.headers.get("referrer-policy")), "referrer-policy header missing");

  const health = await request("/api/health");
  assert(health.ok, `/api/health returned HTTP ${health.status}`);
  const healthBody = await health.json();
  assert(healthBody.status === "ok" && healthBody.service === "shiftpilot", "Application health response is invalid");

  const deepHealth = await request("/api/health?deep=1");
  assert(deepHealth.ok, `Deep health returned HTTP ${deepHealth.status}`);
  const deepBody = await deepHealth.json();
  assert(deepBody.status === "ok" && deepBody.dependencies?.database === "ok", "Database deep health failed");

  const protectedRoutes = await Promise.all([
    "/workspace",
    "/workspace/command-center",
    "/workspace/open-shifts",
    "/workspace/schedule-builder"
  ].map(checkProtectedRoute));

  console.log(JSON.stringify({
    status: "ready",
    origin,
    version: healthBody.version,
    database: deepBody.dependencies.database,
    protected_routes: protectedRoutes,
    duration_ms: Date.now() - startedAt,
    checked_at: new Date().toISOString()
  }, null, 2));
}

check().catch((error) => {
  console.error(JSON.stringify({
    status: "blocked",
    origin,
    message: error instanceof Error ? error.message : "Unknown pilot readiness failure",
    checked_at: new Date().toISOString()
  }, null, 2));
  process.exit(1);
});
