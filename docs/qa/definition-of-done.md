# Definition of Done (DoD)

All work items must meet every applicable criterion before moving to `done`.

## All Tasks

- [ ] Code reviewed and approved by at least one peer
- [ ] CI pipeline passes (lint + tests + build)
- [ ] No new ESLint errors introduced
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] Self-tested in local dev environment

## Backend Feature (api-server / worker-service)

- [ ] Unit tests written for new service logic
- [ ] Integration test covers the happy path of new endpoint(s)
- [ ] Swagger/OpenAPI docs updated if endpoint signature changed
- [ ] DB migration is backwards-compatible or coordinated with deployment

## Frontend Feature (web)

- [ ] E2E test added or updated for affected user flow
- [ ] No console errors in browser during manual smoke test
- [ ] i18n keys added for all user-facing strings (ko + en)
- [ ] Responsive layout verified on 1280px and 375px viewports

## Bug Fix

- [ ] Root cause documented in the PR description or ticket comment
- [ ] Regression test added that would have caught the bug
- [ ] Fix verified in CI (no reliance on "it works locally")

## Infrastructure / CI Change

- [ ] CI pipeline still passes end-to-end after the change
- [ ] Change is documented in the relevant `cicd/` or `.github/` file
- [ ] Rollback plan noted if change affects production deployment
