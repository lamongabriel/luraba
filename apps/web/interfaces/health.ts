export type HealthServiceStatus = "up" | "down"
export type HealthStatus = "ok" | "degraded" | "error"

export interface DependencyHealth {
  status: HealthServiceStatus
  checkedAt: string
  error?: string
}

export interface Health {
  status: HealthStatus
  checkedAt: string
  uptimeSeconds: number
  services: {
    api: {
      status: "up"
      checkedAt: string
      uptimeSeconds: number
    }
    db: DependencyHealth
    fxProviders: Record<string, DependencyHealth>
  }
}
