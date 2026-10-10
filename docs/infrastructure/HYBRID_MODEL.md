# Morvexa Nexus — Hybrid Shared & Dedicated Infrastructure Model

**Document:** `docs/infrastructure/HYBRID_MODEL.md`  
**Date:** 2026-10-10  
**Status:** Approved Infrastructure Baseline (Phase 1)  
**Author:** DevOps & Infrastructure Engineering Team  
**Scope:** Shared Edge Tenancy vs Dedicated Isolated Instances, State Machine, Health Probes  

---

## 1. Operating Modes Overview

Morvexa Nexus supports two distinct deployment tiers designed to balance cost-efficiency with enterprise security and compute isolation:

```
+---------------------------------------------------------------------------------------------------------+
|                                           HYBRID INFRASTRUCTURE                                         |
|                                                                                                         |
|  [ MODE A: SHARED EDGE PROXY ] (Standard Tier)          [ MODE B: DEDICATED ISOLATED NODE ] (Enterprise)|
|  - Multi-tenant Vercel Edge runtime                     - Isolated Docker Container or dedicated VPS    |
|  - Shared compute and memory pool                       - Dedicated CPU cores & RAM allocation          |
|  - Logical tenant isolation via DB RLS                  - Dedicated egress IP & private model endpoints |
|  - Rate limits: 60 - 120 RPM per organization           - High concurrency (1,000+ RPM)                 |
|  - Standard failover mesh (Anthropic / DeepSeek)        - Custom model endpoints (e.g. localhost:5002)  |
|  - Zero fixed infrastructure cost ($0 idle)             - Dedicated monitoring, SLA & health probes     |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Mode A: Shared Infrastructure Architecture

- **Runtime:** Serverless Functions on Vercel's global edge network.
- **Fair-Use & Protection:**
  - Token-bucket rate limiting enforced per API key.
  - Concurrency caps: Max 10 concurrent in-flight streaming requests per organization.
  - Resource boundaries: Inbound body payloads capped at 2MB; streaming duration capped at 300 seconds.
- **No Cross-Tenant Interference:**
  - If Tenant A sends a massive volume of traffic, their edge quota is exhausted without starving Tenant B's rate limits.

---

## 3. Mode B: Dedicated Infrastructure Architecture

For Enterprise customers requiring data sovereignty, private model hosting, or dedicated throughput:

### Supported Runtimes:
1. **Containerized Edge Gateway:** Standalone Docker container running Morvexa Gateway with dedicated memory and CPU pins.
2. **Private GPU / Model Server:** Integration with private model clusters (such as the existing `localhost:5002` private server profile configured in `src/lib/gateway/upstream.ts`).

### Infrastructure Provider Adapter Interface:
```typescript
export interface InfrastructureProviderAdapter {
  validateCapacity(spec: EnvironmentSpec): Promise<boolean>;
  provisionInstance(jobId: string, spec: EnvironmentSpec): Promise<ProvisioningResult>;
  configureNetworking(instanceId: string, config: NetworkConfig): Promise<boolean>;
  checkHealth(instanceId: string): Promise<HealthCheckResult>;
  suspendInstance(instanceId: string): Promise<boolean>;
  deprovisionInstance(instanceId: string): Promise<boolean>;
}
```

---

## 4. Provisioning Lifecycle & State Machine

```
     Customer / DevOps Requests
                 │
                 ▼
          +--------------+
          |  REQUESTED   |
          +-------+------+
                  │
                  ▼
          +--------------+   Failed Validation
          |  VALIDATING  | ───────────────────────────────+
          +-------+------+                                │
                  │                                       │
                  ▼ Passed Entitlement                    │
          +--------------+                                │
          |   APPROVED   |                                │
          +-------+------+                                │
                  │                                       │
                  ▼ Provision Compute Resource            │
          +--------------+   Provider Error               │
          | PROVISIONING | ───────────────────────────────┤
          +-------+------+                                │
                  │                                       │
                  ▼ Configure Ingress & Env               │
          +--------------+   Config Error                 │
          | CONFIGURING  | ───────────────────────────────┤
          +-------+------+                                │
                  │                                       │
                  ▼ Execute Probes                        │
          +--------------+   3 Probe Failures             │
          | HEALTH_CHECK | ───────────────────────────────┤
          +-------+------+                                │
                  │                                       │
                  ▼ 3 Successful Probes                   ▼
          +--------------+                       +─────────────────────+
          |    ACTIVE    |                       | PROVISIONING_FAILED |
          +-------+------+                       +---------------------+
                  │
        +─────────┴─────────+
        │                   │
        │ Deprovision       │ Probe Degraded
        ▼                   ▼
+---------------+   +---------------+
| DEPROVISIONING|   |   DEGRADED    |
+-------+-------+   +---------------+
        │
        ▼
+---------------+
| DEPROVISIONED |
+---------------+
```

---

## 5. Automated Health Probes

1. **Probe Protocol:**
   - Worker sends HTTP `GET /health` or `GET /v1/models` every 60 seconds with 5-second timeout.
2. **Liveness vs Readiness:**
   - **Liveness:** Returns 200 if container process is running.
   - **Readiness:** Returns 200 if model weights are loaded and upstream inferencing is functional.
3. **Failure Policy:**
   - 1 failed probe ➔ Warning logged in `health_check_events`.
   - 3 consecutive failed probes ➔ Environment marked `DEGRADED`. Nexus console triggers alert.
