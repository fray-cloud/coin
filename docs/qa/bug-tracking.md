# Bug Tracking Process

## Bug Report Template

When filing a bug, use the following structure in the issue description:

```markdown
## Bug Report

**Summary:** One-line description of the problem.

**Environment:**

- Branch / version:
- Browser (if UI):
- OS:

**Steps to Reproduce:**

1. ...
2. ...
3. ...

**Expected Behavior:**
What should happen.

**Actual Behavior:**
What actually happens (include error messages, stack traces, screenshots).

**Severity:** critical | high | medium | low

**Logs / Screenshots:**
(attach if available)
```

---

## Priority / Severity Matrix

| Severity     | Definition                                                          | SLA (time to fix)                            |
| ------------ | ------------------------------------------------------------------- | -------------------------------------------- |
| **Critical** | Production data loss, security vulnerability, trading halt          | Fix within 4 hours; hotfix deployed same day |
| **High**     | Core flow broken (login, strategy execution, orders) in prod or dev | Fix within 1 business day                    |
| **Medium**   | Feature degraded but workaround exists; non-critical UI broken      | Fix within current sprint                    |
| **Low**      | Minor UI glitch, cosmetic issue, edge-case inconvenience            | Scheduled in backlog                         |

---

## Triage Process

1. **Reporter** files bug in Paperclip with `bug` label and sets initial severity.
2. **QA Lead** reviews within 1 business day, confirms or adjusts severity.
3. **Critical / High** → immediately assigned to responsible dev team; QA Lead notified.
4. **Medium / Low** → added to sprint backlog; PM prioritises.
5. **QA Lead** verifies fix in CI before marking `done`.
6. **Regression test** added to prevent recurrence (required for Critical/High).

---

## Labels

| Label         | Meaning                                 |
| ------------- | --------------------------------------- |
| `bug`         | Confirmed defect                        |
| `regression`  | Previously working, now broken          |
| `flaky-test`  | Test non-deterministically fails/passes |
| `needs-repro` | Cannot reproduce; awaiting more info    |
| `wont-fix`    | Out of scope or by design               |
