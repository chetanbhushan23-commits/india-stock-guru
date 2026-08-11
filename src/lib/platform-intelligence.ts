export type HealthState = "healthy" | "degraded" | "stale" | "failed" | "unknown";

export type HealthCheck = {
  id: string;
  name: string;
  state: HealthState;
  latencyMs?: number;
  lastCheckedAt?: string;
  detail?: string;
};

export type PlatformHealth = {
  checks: HealthCheck[];
  generatedAt: string;
};

export function buildPlatformHealth(checks: HealthCheck[]): PlatformHealth {
  return {
    checks: checks.filter((check) => check.id && check.name),
    generatedAt: new Date().toISOString(),
  };
}

export function overallHealth(checks: HealthCheck[]): HealthState {
  if (!checks.length) return "unknown";
  if (checks.some((c) => c.state === "failed")) return "failed";
  if (checks.some((c) => c.state === "degraded")) return "degraded";
  if (checks.some((c) => c.state === "stale")) return "stale";
  if (checks.every((c) => c.state === "healthy")) return "healthy";
  return "unknown";
}
