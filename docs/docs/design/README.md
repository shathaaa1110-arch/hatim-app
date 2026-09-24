# Design Documentation — Thouq

Design documentation for **Thouq**, a group dining planner.

Every diagram here is derived from the code on branch `codex/persistent-groups`. No entity in these diagrams is hypothetical. GitHub renders Mermaid automatically, so the diagrams display when you open the files.

## Diagrams

| # | File | Question it answers |
|---|---|---|
| 1 | [Use cases](01-use-cases.md) | Who can do what? |
| 2 | [Class diagram](02-classes.md) | What entities does the system work with? |
| 3 | [Database](03-database.md) | How is data stored and related? |
| 4 | [Sequence diagrams](04-sequences.md) | What happens, step by step? |
| 5 | [Architecture](05-architecture.md) | What depends on what? |

Alongside these: [Design review](06-review.md) — findings from a pass over the codebase, with open issues stated plainly.

## Where each diagram comes from

These diagrams are a representation of the code, not a parallel account of it. Each one traces back to a specific source:

| Diagram | Source in the repository |
|---|---|
| Use cases | API routes across `backend/hatim/features/*/router.py` |
| Classes | `backend/hatim/domain/models.py` and `planner.py` |
| Database | `backend/migrations/001`, `002`, `003` |
| Sequences | `features/accounts/router.py`, `features/planning/service.py` |
| Architecture | `architecture.json`, `scripts/check-architecture.mjs` |

## Stack

| Layer | Technology |
|---|---|
| Client | Expo · React Native · TypeScript |
| Server | FastAPI · Python 3.14 · Pydantic |
| Database | PostgreSQL 18 |
| Runtime | Docker · Docker Compose |

## Scope

**In scope:** accounts and sessions, persistent circles, guest plans via invite link, member preferences, plan generation, attendance, voting and draw rounds.

**Out of scope, deliberately:** table reservations and restaurant partnerships. Both require external parties and operational agreements; they are recorded here so the boundary is a decision rather than an omission.

**Known gap:** the persistence layer is not fully separated — some SQL still lives in `service.py` and `circles.py`. See the [design review](06-review.md).
