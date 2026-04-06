# QA Strategy — Coin Crypto Auto-Trading Platform

## 1. Test Levels

### Unit Tests

- **Scope:** Pure functions, service methods, utility logic
- **Location:** Co-located with source (`*.spec.ts` for NestJS, `*.test.ts` for packages)
- **Tools:** Vitest (web/packages), Jest (api-server)
- **Ownership:** Each dev; CI gate blocks merge on failure
- **Coverage target:** 70% line coverage for business-critical modules (strategies, orders, portfolio)

### Integration Tests

- **Scope:** API controller → service → database round-trips; Kafka event flows
- **Location:** `apps/api-server/test/`
- **Tools:** NestJS testing utilities + Supertest + test Postgres instance
- **Ownership:** Backend dev + QA Lead review
- **CI gate:** Required on all PRs to `dev`

### E2E Tests

- **Scope:** Full user journeys through the web UI against a running stack
- **Location:** `apps/web/e2e/`
- **Tools:** Playwright (Chromium)
- **Ownership:** QA Lead / QA Engineers
- **CI gate:** Required on all PRs to `dev` and `main`

---

## 2. Test Standards by Team

### Backend (api-server, worker-service)

| Rule                  | Requirement                                             |
| --------------------- | ------------------------------------------------------- |
| New endpoint          | Unit test for service + integration test for controller |
| Business logic change | Update affected unit tests before merging               |
| DB schema change      | Migration + test with fresh schema in CI                |
| Kafka event handler   | Unit test consumer logic + integration test event flow  |

### Frontend (web)

| Rule                   | Requirement                              |
| ---------------------- | ---------------------------------------- |
| New page/route         | Add or update corresponding E2E scenario |
| New reusable component | Vitest component test in Storybook       |
| API hook / query       | Mock-based unit test with TanStack Query |
| Auth guard             | Covered by auth E2E suite                |

### Shared packages

| Rule              | Requirement                                      |
| ----------------- | ------------------------------------------------ |
| Exchange adapter  | Unit test per exchange method                    |
| Type changes      | Compile-time validation via `tsc --noEmit` in CI |
| Utility functions | 100% unit test coverage required                 |

---

## 3. E2E Scenario Coverage (Sprint 1)

| #   | Scenario                                | File                 | Status |
| --- | --------------------------------------- | -------------------- | ------ |
| 1   | Unauthenticated redirect to login       | `auth.spec.ts`       | ✅     |
| 2   | Signup — new account creation           | `auth.spec.ts`       | ✅     |
| 3   | Login — valid credentials               | `auth.spec.ts`       | ✅     |
| 4   | Login — invalid credentials shows error | `auth.spec.ts`       | ✅     |
| 5   | Logout — clears session                 | `auth.spec.ts`       | ✅     |
| 6   | Strategy list page loads                | `strategies.spec.ts` | ✅     |
| 7   | Strategy creation form opens            | `strategies.spec.ts` | ✅     |
| 8   | Create strategy — appears in list       | `strategies.spec.ts` | ✅     |
| 9   | Strategy detail navigation              | `strategies.spec.ts` | ✅     |
| 10  | Strategy toggle active/inactive         | `strategies.spec.ts` | ✅     |
| 11  | Portfolio page with balance info        | `portfolio.spec.ts`  | ✅     |
| 12  | Portfolio loads within 5s               | `portfolio.spec.ts`  | ✅     |
| 13  | Orders page renders without error       | `orders.spec.ts`     | ✅     |
| 14  | Markets page with ticker data           | `markets.spec.ts`    | ✅     |
| 15  | Default route redirects to markets      | `markets.spec.ts`    | ✅     |

---

## 4. CI Quality Gates

### PR to `dev`

1. **Lint** — must pass (ESLint, no errors)
2. **Unit & integration tests** — must pass; build must succeed
3. **E2E tests** — must pass on Chromium

### PR to `main`

All of the above + manual QA sign-off comment on the PR.

---

## 5. Definition of Done (DoD)

See [definition-of-done.md](./definition-of-done.md).

---

## 6. Bug Tracking Process

See [bug-tracking.md](./bug-tracking.md).
