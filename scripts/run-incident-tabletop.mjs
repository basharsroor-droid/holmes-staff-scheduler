import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const origin = (process.env.SHIFTPILOT_PRODUCTION_URL ?? "https://www.shiftpilothq.com").replace(/\/$/, "");
const outputPath = process.argv[2] ?? "artifacts/incident-tabletop-report.md";
const repository = process.env.GITHUB_REPOSITORY ?? "basharsroor-droid/holmes-staff-scheduler";

function assertIncludes(content, values, label) {
  for (const value of values) if (!content.includes(value)) throw new Error(`${label} is missing: ${value}`);
}

async function checkLatestBackup() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { status: "skipped locally", ageHours: null };
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/database-backup.yml/runs?per_page=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "ShiftPilot-Incident-Drill/1.0" }
  });
  if (!response.ok) throw new Error(`Could not inspect backup workflow: HTTP ${response.status}`);
  const body = await response.json();
  const run = body.workflow_runs?.[0];
  if (!run || run.conclusion !== "success") throw new Error("Latest database backup workflow is not successful");
  const ageHours = (Date.now() - new Date(run.updated_at).getTime()) / 3_600_000;
  if (ageHours > 36) throw new Error(`Latest successful backup is too old: ${ageHours.toFixed(1)} hours`);
  return { status: "success", ageHours };
}

async function main() {
  const incident = readFileSync(new URL("../docs/INCIDENT_RESPONSE.md", import.meta.url), "utf8");
  const runbook = readFileSync(new URL("../docs/RUNBOOK.md", import.meta.url), "utf8");
  assertIncludes(incident, ["Sev1", "Pause Project", "service_role", "שחזור", "תקשורת"], "Incident response plan");
  assertIncludes(runbook, ["Rollback", "Promote to Production", "git revert", "api/health?deep=1"], "Runbook");

  const response = await fetch(`${origin}/api/health?deep=1`, { signal: AbortSignal.timeout(15_000) });
  const health = await response.json();
  if (!response.ok || health.status !== "ok" || health.dependencies?.database !== "ok") throw new Error("Production deep health failed");
  const backup = await checkLatestBackup();

  const report = `# ShiftPilot Incident Tabletop — technical drill\n\n` +
    `- Checked at: ${new Date().toISOString()}\n` +
    `- Scenario: suspected cross-tenant schedule exposure\n` +
    `- Isolation procedure: present\n` +
    `- Secret-rotation inventory: present\n` +
    `- Recovery and rollback procedures: present\n` +
    `- Production deep health: ok\n` +
    `- Latest encrypted backup: ${backup.status}${backup.ageHours === null ? "" : ` (${backup.ageHours.toFixed(1)} hours old)`}\n` +
    `- Result: PASS\n\n` +
    `This drill is read-only. It validates the technical controls without pausing Production or rotating live secrets.\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, report, "utf8");
  console.log(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
