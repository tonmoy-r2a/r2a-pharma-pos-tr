# Remaining Work Freeze — Batch Execution Plan

> **SUPERSEDED for in-scope product work (2026-09-18).**  
> Use [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md) + wave child files.  
> This freeze (Batches **A–D**) remains **historical DONE** — do **not** re-authorize freeze batches.  
> Out-of-scope items listed here (bi-di, n8n, RLS, Manager web, M7) stay out of scope unless separately authorized.

**Document type:** Fresh-chat execution guide for the **Remaining Work Freeze** only (docs).  
**Source of truth:** [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md)  
**Live progress context:** [`Current_Status.md`](Current_Status.md)  
**API catalog:** [`Completed_API_lists.md`](Completed_API_lists.md)  
**RBAC contract:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md)  
**Authorized plan:** Remaining Work Freeze (2026-09-10)  
**Parent execution files (do not rewrite as DONE):** [`MILESTONE_6_EXECUTION.md`](MILESTONE_6_EXECUTION.md) (Slices 1–5; AC–AD deferred until Prod Wave 2) · [`M6_SLICE_6_EXECUTION.md`](M6_SLICE_6_EXECUTION.md) (Slices 6–8; BN–BQ = Prod Wave 1)  
**Production successor:** [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md)

**Status of this freeze:** **DONE** — Batches **A–D** completed (2026-09-10). **Product resume:** production track (not this file).  
**Prerequisite:** Milestone 0–**5** DONE. M6 Slices 1–6 **DONE**. Slice 7 **BH–BJ DONE**. Slice 2 **AC–AD** already **DEFERRED**.  
**Do not start from this freeze file:** any M6/product/stub work — use the production track instead.

---

## How to use this file

1. Open a **fresh Cursor chat** for each batch.
2. Attach / `@` these files:
   - `PROJECT_MASTER_PLAN.md`
   - `Current_Status.md`
   - `ROLES_AND_PERMISSIONS.md`
   - **`REMAINING_WORK_EXECUTION.md`** (this file)
   - `Completed_API_lists.md`
   - For Batch D only: also `@M6_SLICE_6_EXECUTION.md`
3. Paste **only** that batch’s **Agent prompt** (or say `Authorize Remaining Work Batch X`).
4. Agent implements **only** that batch.
5. When the batch is done, the agent pastes the **short report**. You review.
6. Mark the batch checkbox when its exit check passes.
7. Proceed to the next batch only after the previous one is green.

> **Hard rules:**
> - Implement **one batch per chat**. Do not collapse A–D into a single run.
> - **Docs only.** No app code, i18n, Prisma, APIs, smokes, or UI.
> - Do **not** mark M6 product batches (BK–BQ, AC–AD) as DONE. Change their status labels to **DEFERRED** where this file says to.
> - Do **not** implement printer IPC, card SDK, real MFS APIs, or real Manager PIN / loyalty OTP.
> - Do **not** start `Authorize M6 Batch BK` from this freeze.
> - Copy the inventory and replacement sentences from **this file**. Do not invent a parallel remaining-work taxonomy.

---

## Walkthrough + short-report protocol (mandatory)

| Kind | Who | What |
|------|-----|------|
| **Agent smoke** | Agent | n/a (docs). Confirm the named files contain the required sentences. |
| **User review** | **You** | Short **YOU DO** list. If **None**, confirm the agent report only |

**Agent must, at the end of every batch chat:**

```text
## Remaining Work Batch <ID> report
Done: <1–3 bullets>
Smoke: n/a — docs
YOU DO: <numbered, or none>
Next: Authorize Remaining Work Batch <next>
```

Do **not** start the next batch in the same chat.

---

## Locked decisions

| Topic | Lock |
|-------|------|
| Accepted stubs (out of remaining work) | Real printer IPC, real card SDK, real MFS APIs, real Manager PIN / loyalty OTP. Existing invented/stub POS flows stay. Do **not** list them as next work. |
| M6 | **Paused.** Remaining scoped batches + parked Owner-web items = **DEFERRED**. Architectural leftovers = **UNDONE**. |
| M7 | **PENDING** (multi-branch, transfers, Super Admin, enterprise RBAC). No Phase 3 build from this file. |
| Feature code | None. Resume later with `Authorize M6 Batch …` from the existing M6 execution files. |

Classification (use these labels in status docs):

| Label | Meaning |
|-------|---------|
| **DEFERRED** | Paused with intent to resume (already-scoped M6 batches and parked screens) |
| **UNDONE** | Never started (M6 architectural leftovers) |
| **PENDING** | M7 |
| **ACCEPTED STUB** | The four POS items above — not remaining work |

---

## Remaining inventory (copy into Current_Status §1b — Batch A)

Use these tables **verbatim** (agents may fix markdown wrapping, not the row meaning).

### M6 DEFERRED (scoped, not started or paused)

| Batch | What | Notes |
|-------|------|--------|
| **AC** | Return Manifest Details + Dispatch / Decision / Complete modals | APIs already live from Batch R. `/suppliers/returns/:manifestId` is still a placeholder. |
| **AD** | Slice 2 exit (catalog §22 + `smoke:m6s2`) | Blocked on AC. |
| **BK** | Audit Detail + Review modal + Apply FEFO | Dashboard live at `/audit`. Detail is a placeholder. |
| **BL** | Slice 7 exit (catalog §27, `smoke:m6s7`) | Blocked on BK. |
| **BM–BQ** | Slice 8 Settings / Business Profile / Account Profile / Help / Slice 8 exit | Not started. See [`M6_SLICE_6_EXECUTION.md`](M6_SLICE_6_EXECUTION.md). |

### M6 PARKED (on live screens, disabled)

Edit Customer, Edit Supplier, Inventory/Purchase report pages, Export/Print on several pages, Generate Report (Audit/Shift), Request Cash Count, View All POs/Products by supplier, Review All Issues, Save as Draft, branch switcher, Settings hub cards (Branch / Roles / Preferences / Security / Audit & Data), Help tickets, desktop stock-audit count UI (APIs exist after BI).

### M6 UNDONE (Phase 2 rest, never started)

Bi-directional sync, n8n webhooks (`workflows/` still empty), Postgres RLS, Manager web.

### Other deferred design notes (not a milestone batch)

CSV/Excel catalog import, Owner/Manager terminal presence, cloud/shared held sales, desktop Transactions staying local (Owner web sales are already live).

### M7 PENDING

Multi-branch, inter-branch transfers, Super Admin console, enterprise RBAC.

### ACCEPTED STUB (do not list as next work)

Print stub (no real printer IPC). Card stub (no terminal SDK). MFS invented confirm (no real bKash/Nagad/Rocket APIs). Manager PIN / loyalty OTP = any digits, not real auth.

---

## Batch overview

| Batch | Title | Depends | Re-share? |
|-------|-------|---------|-----------|
| **A** | Remaining work board in `Current_Status.md` | — | No |
| **B** | Pause next-gated-work + resume steps | A | No |
| **C** | Stale TODO cleanup (already-done items) | B | No |
| **D** | Light-sync master plan + Slice 6+ header + freeze exit | C | No |

Order: **A → B → C → D**.

---

## Batch A — Remaining work board

**Goal:** Add one table-heavy remaining-work board near the top of `Current_Status.md` so returning chats do not re-scan the whole file.

**Re-share screen:** none.

### Tasks

- [x] Set `Current_Status.md` **Last updated** to **2026-09-10**
- [x] Insert **`## 1b. Remaining work board`** immediately after §1 (after the Bottom line) and **before** §2. Do **not** renumber §2–§13
- [x] §1b contains the inventory tables from this file (DEFERRED / PARKED / UNDONE / other notes / M7 PENDING)
- [x] §1b states accepted stubs are **out of remaining work** (list them once, as ACCEPTED STUB, not as next work)
- [x] Add this file to §11 Key documents map: [`REMAINING_WORK_EXECUTION.md`](REMAINING_WORK_EXECUTION.md) — Remaining M6/M7 freeze + classified leftover board
- [x] Changelog row dated **2026-09-10**: Batch A remaining work board added
- [x] No app code. Do not change §1 **Next gated work** yet (Batch B)

### Exit check

- §1b exists between §1 and §2 with the five leftover groups plus accepted stubs
- §11 lists this execution file
- `Authorize M6 Batch BK` is still the §1 next-gated cell until Batch B

### Agent prompt

```text
Implement ONLY Remaining Work Batch A from REMAINING_WORK_EXECUTION.md
(Remaining work board in Current_Status.md). Docs only.
When done, paste the short Remaining Work Batch A report.
```

**YOU DO:** Open `Current_Status.md` — confirm §1b sits under the one-glance summary and lists AC/BK–BQ as deferred.

**Next:** `Authorize Remaining Work Batch B`.

---

## Batch B — Pause next-gated-work

**Goal:** Stop auto-starting M6. Remaining M6 + M7 stay deferred/undone until re-authorized.

**Re-share screen:** none.

### Tasks

- [x] §1 **Next gated work** → **M6 paused.** Remaining M6 + M7 stay **deferred / undone** until re-authorized. Do **not** start `Authorize M6 Batch BK` from status alone. See §1b. Accepted stubs (print / card / MFS / PIN-OTP) are **out of remaining work**.
- [x] §1 **Bottom line** → M0–M5 remain DONE. **M6 IN PROGRESS (paused).** Slices 1–6 **DONE**; Slice 7 **BH–BJ DONE**; BK–BQ + AC–AD **deferred**. **M7 PENDING**. See §1b.
- [x] Slice 7 batch table: **BK** and **BL** status **PENDING** → **DEFERRED**. Intro line **BK–BL gated** → **BK–BL deferred**
- [x] Add a Slice 8 batch table under Slice 7 (BM–BQ) with status **DEFERRED** (titles from [`M6_SLICE_6_EXECUTION.md`](M6_SLICE_6_EXECUTION.md); do not mark checkboxes in that file until Batch D)
- [x] §9: replace the bullet that says Next = **Authorize M6 Batch BK** with: M6 paused; remaining Slice 7–8 + AC–AD classified in §1b; do not start BK from this list
- [x] §9: keep Manager web / bi-di / n8n / RLS as later M6; keep Super Admin as M7; **remove** real Card/MFS from “later authorized work” here (they are ACCEPTED STUB — already called out in §1b)
- [x] §10 resume steps: confirm M0–M5 DONE; **M6 paused** — remaining work in §1b; to resume M6 later, authorize a batch from `MILESTONE_6_EXECUTION.md` (AC) or `M6_SLICE_6_EXECUTION.md` (BK+); attach **`REMAINING_WORK_EXECUTION.md`**
- [x] Milestone board M6 row: still **IN PROGRESS**; say Slices 1–6 DONE, Slice 7 BH–BJ DONE, **BK–BQ + AC–AD deferred** (not “next = BK”)
- [x] Changelog row: Batch B pause next-gated-work
- [x] No app code

### Exit check

- Searching `Current_Status.md` for `Authorize M6 Batch BK` as the automatic next command finds **no** §1 / §10 “next = BK” instruction
- BK/BL table cells say **DEFERRED**

### Agent prompt

```text
Implement ONLY Remaining Work Batch B from REMAINING_WORK_EXECUTION.md
(Pause next-gated-work in Current_Status.md). Docs only.
When done, paste the short Remaining Work Batch B report.
```

**YOU DO:** Read §1 Next gated work — it must say M6 paused, not Authorize BK.

**Next:** `Authorize Remaining Work Batch C`.

---

## Batch C — Stale TODO cleanup

**Goal:** Fix status sentences that still say work is TODO when it already shipped. Do not rewrite history rows in §13.

**Re-share screen:** none.

### Tasks

- [x] §12 **9c**: remove “No cloud shift API yet (TODO when authorized).” Desktop cloud shift is **DONE (M6 Batch AY)** — opening float, counted cash, `shiftId` on ingest; Owner web Shift Management live (AZ–BB). Keep: soft gate, connectivity badge independent of shift, local cache of cloud active shift
- [x] M3 Slice 4 note (~line 123): **cloud sales list / cloud shift remain TODOs** is stale. Owner `GET /sales` + Owner web Sales/Transaction Details + cloud shift are live. Keep printer / card / MFS as **ACCEPTED STUB** (not TODOs-to-plan)
- [x] Any other **current-state** sentence in `Current_Status.md` that still claims cloud `GET /sales` or cloud shift is unbuilt — fix to match M6 E / AY. Do **not** edit past changelog rows
- [x] Changelog row: Batch C stale TODO cleanup (cloud shift + Owner sales already live)
- [x] No app code. Do not touch `MILESTONE_3_EXECUTION.md` historical “still later” lists unless a sentence is presented as live current state in `Current_Status.md`

### Exit check

- `Current_Status.md` §12 9c no longer says there is no cloud shift API
- Live summary text no longer lists cloud sales list / cloud shift as open TODOs

### Agent prompt

```text
Implement ONLY Remaining Work Batch C from REMAINING_WORK_EXECUTION.md
(Stale TODO cleanup in Current_Status.md). Docs only.
When done, paste the short Remaining Work Batch C report.
```

**YOU DO:** None required beyond confirming 9c mentions M6 AY cloud shift.

**Next:** `Authorize Remaining Work Batch D`.

---

## Batch D — Light-sync + freeze exit

**Goal:** Point master plan and Slice 6+ execution at the pause. This freeze is complete. Product M6/M7 stay deferred/undone.

**Re-share screen:** none.

### Tasks

- [x] [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md) **§9 Suggested Next Command** → M0–M5 DONE; **M6 paused**; remaining M6 + M7 **deferred / undone** until the user authorizes a batch; attach `Current_Status.md` §1b and `REMAINING_WORK_EXECUTION.md`; do not start BK / AC / M7 from the master plan alone
- [x] Master plan M6 row: keep **IN PROGRESS**; add **paused 2026-09-10** — BK–BQ + AC–AD **deferred**
- [x] Master plan M7 row: stay **PENDING**
- [x] Master plan progress log row **2026-09-10**: Remaining Work Freeze A–D (docs); M6 remaining + M7 deferred/undone
- [x] [`M6_SLICE_6_EXECUTION.md`](M6_SLICE_6_EXECUTION.md) **header**: Slice 6 BE–BG DONE; Slice 7 BH–BJ DONE; **BK–BQ deferred** (not “next = BK”). Do **not** check BK–BQ task boxes as done
- [x] `M6_SLICE_6_EXECUTION.md` **Do not start** line: BK+ / AC / M7 remain unauthorized; remaining-work classification lives in `Current_Status.md` §1b
- [x] `M6_SLICE_6_EXECUTION.md` changelog row **2026-09-10**: header paused; next is not BK unless user re-authorizes
- [x] This file: mark Batches A–D checkboxes **DONE** with date **2026-09-10**; header **Status of this freeze: DONE**
- [x] `Current_Status.md` changelog + §11 already pointing here; add freeze **A–D DONE** row if missing
- [x] Do **not** start n8n / RLS / bi-di / Batch AC / Batch BK

### Exit check

- Master plan §9 does not tell agents to authorize the next M6 slice by default
- `M6_SLICE_6_EXECUTION.md` header says BK–BQ **deferred**
- This file header says freeze **DONE**

### Agent prompt

```text
Implement ONLY Remaining Work Batch D from REMAINING_WORK_EXECUTION.md
(Light-sync PROJECT_MASTER_PLAN.md + M6_SLICE_6_EXECUTION.md + freeze exit).
Docs only. Do not implement BK or AC.
When done, paste the short Remaining Work Batch D report.
```

**YOU DO:** Confirm master plan §9 and `M6_SLICE_6_EXECUTION.md` header both say M6 remaining is deferred.

**Next after PASS:** none from this file. Later product work (when you choose) = `Authorize M6 Batch BK` or deferred `Authorize M6 Batch AC` from the existing M6 execution files.

---

## Out of this freeze (never build from these batches)

- Remaining M6 product: AC–AD, BK–BQ, parked buttons, desktop stock-audit count UI
- M6 architectural rest: bi-di sync, n8n, Postgres RLS, Manager web
- M7: multi-branch, transfers, Super Admin, enterprise RBAC
- Replacing print / card / MFS / PIN-OTP stubs

---

## Fresh-chat command templates

**Docs batch (A–D):**

```text
@PROJECT_MASTER_PLAN.md @Current_Status.md @ROLES_AND_PERMISSIONS.md
@REMAINING_WORK_EXECUTION.md @Completed_API_lists.md

Authorize Remaining Work Batch A.
Implement ONLY that batch. One batch only. Docs only.
When done, paste the short Remaining Work Batch report.
```

For Batch D, also attach `@M6_SLICE_6_EXECUTION.md`.

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-18 | **Prod W0C:** confirmed SUPERSEDED for in-scope product; freeze A–D remain historical DONE — do not re-run. |
| 2026-09-18 | **SUPERSEDED for in-scope product** by [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md). Freeze A–D remain historical DONE. |
| 2026-09-10 | **Remaining Work Freeze A–D completed (DONE).** Master plan, Current Status, and Slice 6+ headers synchronized to paused state. Leftovers classified (DEFERRED / UNDONE / PENDING); accepted POS stubs out of remaining work. Next work requires explicit user re-authorization. |
| 2026-09-10 | **Remaining Work Freeze planned (A–D not started).** Docs-only: classify leftover M6 + M7 as deferred/undone; accepted POS stubs out of remaining work; pause auto-next BK. Next = `Authorize Remaining Work Batch A`. |
