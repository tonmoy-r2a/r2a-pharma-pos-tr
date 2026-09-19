# Production Wave 6 — Exit Execution Plan

**Document type:** Fresh-chat execution guide for **Wave 6** (production track exit: composed smoke, governance sync, pilot runbook).  
**Master index:** [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md)  
**Source of truth:** [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md)  
**Live progress:** [`Current_Status.md`](Current_Status.md)  
**API catalog:** [`Completed_API_lists.md`](Completed_API_lists.md)  
**RBAC:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md)

**Status of Wave 6:** **NOT STARTED** (gated on Wave 5 **S5** DONE).  
**Prerequisite:** Waves 0–5 complete (BN–BQ, AC–AD, P1–P15, S1–S5).  
**Do not start:** bi-di, n8n, RLS, Manager web, M7 from this exit. Do **not** mark full M6 milestone DONE (those leftovers remain UNDONE by exclusion).

---

## How to use

1. Fresh chat per batch **X1 → X2 → X3**.
2. Attach: master + this file + all governance docs; for X1 also prior smoke scripts as needed.
3. `Authorize Prod Batch X<n>`.
4. Short report → YOU DO → next.

> **Hard rules:** Docs + composed smoke only in X2–X3 sense; X1 may add smoke harness scripts. No new product features. No enabling OUT OF SCOPE items.

---

## Short-report format

```text
## Prod Batch <ID> report
Done: <1–3 bullets>
Smoke: PASS | FAIL | n/a — <name>
YOU DO: <numbered, or none>
Next: Authorize Prod Batch <next>
```

---

## Batch overview

| Batch | Title | Depends | Code? |
|-------|-------|---------|-------|
| **X1** | Composed `smoke:prod-exit` | S5 | Smoke harness |
| **X2** | Governance sync (status / master / RBAC / catalog / execution headers) | X1 | Docs |
| **X3** | Pilot runbook appendix | X2 | Docs |

Order: **X1 → X2 → X3**.

---

## Batch X1 — Composed production exit smoke

**Goal:** One command proves the production track regressions.

### Tasks

- [ ] Add `smoke:prod-exit` (root and/or workspaces) composing at minimum:
  - `smoke:m5` (MVP regression)
  - `smoke:m6s2` (requires AD)
  - `smoke:m6s8` (requires BQ)
  - `smoke:m6s7` (Slice 7 still green)
  - Key prod smokes: `prod-p1`… as registered, or a documented subset if full suite is too long — **lock: must include m5 + m6s2 + m6s8 + prod-s1 + prod-s3 mock + prod-s5 mock**
- [ ] Document run order and env prerequisites in script header
- [ ] All green → PASS
- [ ] Do not add new features to make smoke pass (fix only regressions)

### Exit check

- `npm run smoke:prod-exit` **PASS**

### Agent prompt

```text
Implement ONLY Prod Batch X1 from PROD_WAVE_6_EXIT_EXECUTION.md
(Composed smoke:prod-exit). No new product features.
When done, paste the short Prod Batch X1 report.
```

**YOU DO:** Optionally re-run `smoke:prod-exit` locally.

**Next:** `Authorize Prod Batch X2`.

---

## Batch X2 — Governance sync

**Goal:** Single source of truth reflects production track completion for in-scope items.

### Tasks

- [ ] [`Current_Status.md`](Current_Status.md) §1 + §1b:
  - Production track Waves 0–5 **DONE**
  - **WAS ACCEPTED STUB** section removed / marked retired
  - PARKED list reduced to **STILL DISABLED (honest)** only
  - OUT OF SCOPE unchanged (bi-di, n8n, RLS, Manager web, M7)
  - Next gated work → do **not** auto-start M7; say authorize explicitly when ready
- [ ] §12 notes #10, #11, #20, 9b, 9d updated to DONE / current behavior
- [ ] [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md) §9 + M6 row + progress log
- [ ] [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md): PIN live, checkout real MFS/Card, OTP live; remove stub language
- [ ] [`Completed_API_lists.md`](Completed_API_lists.md): ensure §§ for settings, returns exit, prod payments/PIN/OTP/presence/holds/import present
- [ ] Execution file headers: Wave 0/3/4/5/6 + master status **DONE** where applicable; M6 Slice 8 BQ DONE; AC–AD DONE
- [ ] [`REMAINING_WORK_EXECUTION.md`](REMAINING_WORK_EXECUTION.md): keep superseded note; inventory historical
- [ ] Changelog rows dated today on touched docs
- [ ] No feature code

### Exit check

- Searching status for “ACCEPTED STUB” as current work finds none (historical changelog OK)
- §1 next is not “Authorize M7” by default

### Agent prompt

```text
Implement ONLY Prod Batch X2 from PROD_WAVE_6_EXIT_EXECUTION.md
(Governance sync). Docs only.
When done, paste the short Prod Batch X2 report.
```

**YOU DO:** Skim §1 / §1b — stubs retired; out-of-scope still listed.

**Next:** `Authorize Prod Batch X3`.

---

## Batch X3 — Pilot runbook appendix

**Goal:** Operator-facing setup for production pilot.

### Tasks

- [ ] Add section to [`docs/DEV_RUNBOOK.md`](docs/DEV_RUNBOOK.md) **or** new [`docs/PILOT_RUNBOOK.md`](docs/PILOT_RUNBOOK.md) (prefer new if DEV_RUNBOOK is already long):
  - Printer install / select / 58 vs 80mm
  - MFS sandbox → production cutover checklist
  - Card terminal driver install + env
  - Manager PIN set/reset
  - SMS OTP provider config + test number
  - Presence / heartbeat sanity
  - Catalog CSV import template link
  - Smoke commands including `smoke:prod-exit`
- [ ] Link from `Current_Status.md` §11
- [ ] Master production execution change log: track **DONE**
- [ ] No secrets in docs — placeholders only

### Exit check

- Runbook exists and is linked from §11
- Master file status: Production track **DONE** (in-scope); M6 overall still IN PROGRESS if out-of-scope remains

### Agent prompt

```text
Implement ONLY Prod Batch X3 from PROD_WAVE_6_EXIT_EXECUTION.md
(Pilot runbook appendix). Docs only.
When done, paste the short Prod Batch X3 report.
```

**YOU DO:** Read pilot runbook once; confirm placeholders for secrets.

**Next after PASS:** none from this track. Later (separate authorization only): bi-di / n8n / RLS / Manager web / M7.

---

## Production track definition of done (in-scope)

- [ ] Wave 0–6 all batches checkbox DONE
- [ ] `smoke:prod-exit` PASS
- [ ] No POS payment/print/PIN/OTP stubs on production path
- [ ] AC–AD + BN–BQ live
- [ ] P1–P15 live per their exit checks
- [ ] Still-disabled M7/ticket items honest
- [ ] Out-of-scope never started

---

## Fresh-chat template

```text
@PROJECT_MASTER_PLAN.md @Current_Status.md @ROLES_AND_PERMISSIONS.md
@PRODUCTION_REMAINING_EXECUTION.md @PROD_WAVE_6_EXIT_EXECUTION.md
@Completed_API_lists.md

Authorize Prod Batch X1.
Implement ONLY that batch. One batch only.
When done, paste the short Prod Batch X1 report.
```

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-18 | Wave 6 exit plan authored (X1–X3). Gated on Wave 5. |
