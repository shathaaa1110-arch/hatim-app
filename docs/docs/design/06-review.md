[← Back to index](README.md)

# 6 · Design Review

A pass over the codebase on branch `codex/persistent-groups` (`e8bcc6d`), checking that the diagrams in this folder match the code and looking for defects. Findings are ordered by how much they matter, with the evidence for each.

Nothing below is a guess. Every finding was reproduced by running the code or by checking the file directly.

## What holds up

Stated first, because a review that lists only problems misrepresents the codebase.

- **The domain is genuinely pure.** `domain/planner.py` and `domain/models.py` import nothing from the web framework or the database. 189 tests run against them in 0.38 seconds.
- **Determinism is designed in, not accidental.** The three-key sort makes plan output reproducible, which is what allows tests to assert on exact plans rather than on properties.
- **Sign-in resists account enumeration** on both axes: identical failure messages and equalised response time via `DUMMY_HASH`. The second is frequently missed even in production systems.
- **Authorisation failures return 404, not 403,** where the caller has no relationship to the resource — so resource ids cannot be enumerated.
- **Cross-circle voting is impossible by schema**, not by application code. `votes` reaches `circle_members` through a composite foreign key.
- **Migrations are checksummed.** Editing an already-applied migration fails startup rather than letting environments drift apart.
- **The rate-limit counter commits on its own connection**, so a rejected login cannot roll back the attempt count. This is a subtle correctness point and it was handled.
- **Deployment is hardened**: read-only container, `no-new-privileges`, database bound to localhost, `sslmode=require` in the deployment example.
- **No secrets are committed.** Only `.env.example` files are present.

## Finding 1 — Declaring any allergy empties the plan entirely

**Severity: high. Product behaviour, not a crash.**

`evaluate()` excludes an experience when a member's allergen is present in `allergens`, **or** when it is absent from `verified_free_of`. No entry in the seeded catalogue has a non-empty `verified_free_of`. The result is that a single declared allergy excludes all nine experiences, even an allergen that appears in none of them.

Reproduced directly:

```
catalog size: 9
entries with non-empty verified_free_of: 0

no allergies    -> selected=9  pocket=0  blocked=0
peanut allergy  -> selected=0  pocket=9  blocked=9
```

The rule itself is defensible and is arguably the right default for a safety constraint: undocumented is not the same as verified, and cross-contact is real. The problem is that the dataset makes the conservative branch fire universally, so the feature most in need of care — planning around an allergy — is the one that returns nothing.

The system does not fail silently: each pocket item carries a written reason, and `anchor_issue` is set. But `selected` is empty, and no part of the UI explains that *every* option was excluded for a documentation reason rather than an actual conflict.

**This is a decision for the team, not a line to patch.** Three options, with what each costs:

| Option | Effect | Cost |
|---|---|---|
| Populate `verified_free_of` in the fixture catalogue | Plans work for members with allergies | The catalogue is fictional; claiming verification that never happened is dishonest, even in demo data |
| Distinguish "conflict" from "unverified" in the pocket, and show a dedicated empty-plan state | Honest and shippable; the user learns why | A day of UI work |
| Relax the rule so unlisted allergens do not exclude | Plans populate immediately | Weakens the safety guarantee that is the system's strongest claim |

The second option is recommended. It keeps the rule, and turns an empty screen into an explanation.

## Finding 2 — A plain `.env` file would be committed

**Severity: medium. One-line fix.**

`.gitignore` line 34 reads `.env*.local`. That pattern matches `.env.local` and `.env.production.local`. It does **not** match `.env`, `backend/.env`, or `.env.production`.

Verified with `git check-ignore -v`:

```
.gitignore:34:.env*.local    backend/.env.local     ← ignored
(.env and backend/.env produced no match)          ← NOT ignored
```

The documented workflow uses `.local` suffixes, so nothing is leaking today. The risk is that `backend/.env` is the conventional filename almost everywhere else, and a teammate who creates one would commit a live `DATABASE_URL` without any warning.

**Fix** — replace line 34:

```diff
 # local env files
-.env*.local
+.env
+.env.*
+!.env.example
+!.env.*.example
```

This ignores every env file and re-admits the examples that are meant to be tracked.

## Finding 3 — Global rate-limit keys let one caller lock out everyone

**Severity: medium.**

Beyond the per-handle limit, sign-in and registration each increment a single shared counter:

```python
throttle("login:" + body.handle, 10)   # per handle — correct
throttle("login-total", 120)           # one row for the entire service
```

`"login-total"` is a literal string, so all users share one row in `auth_attempts`. Once 120 sign-in attempts occur within a ten-minute window — from any combination of users — every subsequent sign-in receives `429` until the window expires. The same applies to registration at 60.

The in-code comment explains the intent: bounding Argon2 CPU cost on a small public test service. That is a legitimate concern. But as written, the mechanism is a denial-of-service lever: one script can lock every real user out of the product for ten minutes at a cost of 120 requests.

**Options:**

- Key the global limiter by client IP rather than by a constant, keeping a per-handle limit alongside it.
- Keep the global cap but raise it well above expected legitimate traffic, and return `503` rather than `429` so the signal is "server saturated" rather than "you are being throttled".
- If the intent is purely CPU protection, bound concurrent hashing with a semaphore instead of rejecting requests.

## Finding 4 — The persistence layer is not separated

**Severity: low as a defect, relevant as documentation.**

SQL is written inline in `features/planning/service.py` and `features/groups/circles.py`. The three-layer diagram in [05-architecture.md](05-architecture.md) therefore represents the intended design rather than the current file layout.

This is already noted in that document, and it is the right way to handle it: a diagram that claims a separation the code does not have is worse than a diagram with a stated gap. The work to close it is mechanical — move queries into `repository.py` per feature — and does not change behaviour. `features/experiences/repository.py` already exists and shows the intended shape.

## Finding 5 — The pure-domain tests are not import-isolated

**Severity: low.**

`tests/test_planner.py` tests pure domain code, but it imports its fixtures through `hatim.features.experiences.fixtures`. That triggers `features/experiences/__init__.py`, which imports the router, which imports `core.db`, which imports `psycopg`. Running the domain tests therefore requires FastAPI and a PostgreSQL driver to be installed, even though nothing under test touches either.

Confirmed by installing dependencies one at a time until collection succeeded: `pydantic` → `fastapi` → `psycopg` were each required before the 189 tests could run.

The domain is genuinely decoupled; only the test's import path is not. Moving `CATALOG` into a module that does not sit behind a feature's `__init__` would make the isolation demonstrable — which matters, because "our domain layer has no framework dependencies" is a claim a reviewer may want to see proven rather than asserted.

## Finding 6 — Two unreachable-today crash paths

**Severity: informational.**

`update_profile` in `features/accounts/router.py` does `UPDATE ... RETURNING *` and passes the result straight to `account_model(row)`. If the account disappeared between session validation and the update, `row` is `None` and the call raises `TypeError`, surfacing as a `500`. The same shape appears in `rename_plan`.

Neither is reachable today: there is no account-deletion endpoint, and `rename_plan` holds `FOR UPDATE` on the row. Worth a guard if account deletion is ever added.

## Corrections applied to the diagrams

The review turned up two places where the diagrams did not match the code. Both are fixed in this folder:

| Was | Is |
|---|---|
| `POST /api/v2/login` | `POST /api/v2/auth/login` — the accounts router carries the prefix `/api/v2/auth` |
| Response described as a session cookie | The response body carries a token; the client sends `Authorization: Bearer <token>`. No cookie is set, so CSRF does not apply to these endpoints |

## Suggested order of work

| Priority | Item | Effort |
|---|---|---|
| 1 | Decide and document the allergy behaviour (Finding 1) | Decision now, UI work later |
| 2 | Fix `.gitignore` (Finding 2) | Minutes |
| 3 | Re-key the global rate limiter (Finding 3) | An hour |
| 4 | Move SQL into repository modules (Finding 4) | A day |
| 5 | Relocate test fixtures (Finding 5) | An hour |
