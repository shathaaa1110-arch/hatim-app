# حاتم · Hatim

An Arabic-first React Native app for choosing food experiences within a limited number of meal slots. Discovery, an adaptable plan and the pocket are the core; persistent groups are an optional feature. The organizer uses the iPhone app; invited members use a browser link.

This branch uses **Python 3.14 + FastAPI + PostgreSQL 18**. The .NET implementation remains on [codex/dotnet-backend](https://github.com/shathaaa1110-arch/hatim-app/tree/codex/dotnet-backend), including its Arabic learning guide. The persistent-group API lives under `/api/v2`; direct planning endpoints work without an account or persistent group. Both use the same planner.

For a beginner's explanation of this implementation, read [ابني حاتم بيدك — Python وPostgreSQL](docs/learning-python-postgres/README.ar.md). The Arabic guide includes the original lessons plus chapters on subsequent changes, an annotated reference covering 48 source/configuration files, school-requirement gaps, and the [application architecture](docs/architecture-python-postgres.ar.md). The 48-file codebook preserves revision `59d45d3`; newer chapters describe later code explicitly.

The iPhone opens discovery without asking for an account. Starting a plan, choosing an anchor or saving a pocket item opens preferences and meal slots. **قروباتي** opens the saved-group feature with a route back to discovery. See [the core-flow explanation](docs/learning-python-postgres/15-experiences-first.ar.md) and [direct planning API](docs/api-planning.ar.md).

**حسابي**, at the top of discovery, provides registration/login/logout, display-name editing and saved direct plans. Signed-in users can create multiple plans, recover them on another device, rename and delete them. Saving an existing guest plan to the account is explicit and preserves its companions, constraints and pocket. Accounts are shared with the optional group feature; browsing still needs no login. See the [account walkthrough](docs/learning-python-postgres/16-accounts-and-school.ar.md), [current school requirements](docs/school-readiness.ar.md), and [deployment files](docs/deployment.ar.md).

Optional group features: saved preferences and personal pinning, independent outings and attendance, voting on the anchor, owner/coordinator/member permissions, a shared stored random draw, opt-in 30-second bench cards, real removal/restoration, and archived outings. Read the [current architecture](docs/architecture-python-postgres.ar.md), [v2 API reference](docs/api-social.ar.md), and [original proposal with implementation differences](docs/proposals/persistent-groups.ar.md). Architecture and learning material change with the code as required by AGENTS.md.

The implemented [modular architecture](docs/architecture-modules.ar.md) separates accounts, experiences, planning and optional groups. `src/application` composes feature entrypoints; `src/shared` provides UI, HTTP and storage. Backend `features` use shared `domain` rules and `core` infrastructure. Public interfaces and dependency-cycle checks run with `npm run check:architecture` and `npm run check`. Read [chapter17](docs/learning-python-postgres/17-extensible-architecture.ar.md) for adding a feature by hand.

## Start locally

Requirements: Node 22.13+, npm, uv, Docker/OrbStack, Xcode 26.4+ and CocoaPods for iOS. Install cloudflared for public invitations.

```sh
npm ci
uv sync --project backend --locked
npm run db:up
npm run web:build
npm run api
```

`db:up` starts the official PostgreSQL 18.4 container with a persistent Docker volume. It creates a random development password in ignored `.env.postgres.local` and a connection string in ignored `backend/.env.local`, with private file permissions. Existing files are preserved. PostgreSQL listens only on `127.0.0.1:5432`.

The API applies numbered SQL migrations on startup and listens on port 8000. `GET /api/health` checks a real PostgreSQL connection and reports `backend: python`, `database: postgresql`. Missing `DATABASE_URL` or an unavailable database fails clearly; the application never falls back to SQLite.

- Browser invitation entry: `http://127.0.0.1:8000/`
- Organizer development preview: `http://127.0.0.1:8000/?preview=organizer`
- API documentation: `http://127.0.0.1:8000/api/docs`
- OpenAPI contract: `http://127.0.0.1:8000/api/openapi.json`

`npm run db:stop` stops only Hatim's PostgreSQL container and preserves its volume. `npm run db:status` shows its state. Do not delete the volume or regenerate the password file to troubleshoot an ordinary connection error.

For your own PostgreSQL server, copy `backend/.env.example` to `backend/.env.local` and set `DATABASE_URL` with the server's TLS settings. You can omit Docker. The database role needs privileges to create the schema/migrations and read/write the application tables. The local development role can also create the temporary schemas used by tests. Database credentials are server-only; never put them in `EXPO_PUBLIC_*` variables.

## Public invitations

With PostgreSQL running:

```sh
npm run public:test
```

The script starts a temporary Cloudflare tunnel, saves its HTTPS origin in the root `.env.local`, exports the Expo web companion, and starts FastAPI on port 8000. It can reuse a healthy Python/PostgreSQL Hatim API already serving the web companion on that port. It checks `api_generation: 2` and refuses an older, unrelated, or .NET service. Reusing a process does not reload modified backend code; restart your API after backend edits.

Leave the terminal open. Ctrl+C stops only the API/tunnel processes started by the script; PostgreSQL keeps running. If cloudflared is not on PATH, `.tools/cloudflared` is also supported. Only the HTTP API is tunneled, never the PostgreSQL port.

For the current plan use **خطّتنا → رفقة الطلعة وذوقي → اعزم الربع**. For a persistent group use **قروباتي → القروب → اعزم الربع**. Both copy a real `/join/<random-code>` link; direct companions do not need accounts, while persistent-group members do. The root website remains the invitation entry. The Mac, database, API, and tunnel must remain running. Quick Tunnel origins change on restart: rebuild the native app with the new origin and share the refreshed invitation URL. IDs and invitation codes remain in PostgreSQL.

## iPhone and Simulator

Start the API/tunnel before building for a physical phone:

```sh
npx expo prebuild --platform ios
open ios/Hatim.xcworkspace
```

Select the **Hatim** scheme, connected iPhone, and Apple development team under Signing & Capabilities. The bundle identifier is `com.hatim.app`; change it in app.json and regenerate if needed. For a standalone test choose **Edit Scheme → Run → Build Configuration → Release**, then Run. Release bundles JavaScript/assets and does not require Metro. The Python server remains separate from the installed iPhone app.

For the iOS simulator, start `npm run api`, then in another terminal:

```sh
npm run ios:release
```

The simulator uses `http://localhost:8000` directly. A physical iPhone uses `EXPO_PUBLIC_API_URL`; invitations copied in the simulator also use that public origin. A Release rebuild is required when its configured public address changes. Use `npm start` with a Debug native build for live development.

The generated `ios/` and `android/` projects are intentionally untracked. Keep durable configuration in app.json and dependencies in package files. Native Liquid Glass is used when available on iOS; other platforms use a translucent fallback. Expo UI supplies the universal sliders and switches. The web development workflow here is export + API at one origin; `npm run web` alone does not proxy `/api` to port 8000.

## Move existing SQLite groups to PostgreSQL

The one-time importer preserves group/member IDs, invitation codes, token hashes, preferences, settings, timestamps, and member order. Stop the old API before importing so there are no writes after the snapshot. Start PostgreSQL, with an empty application destination, then run from the repository root:

```sh
npm run db:import -- data/hatim.sqlite3
```

This command runs from `backend/`, so the source above means `backend/data/hatim.sqlite3`. An absolute source path also works. The importer opens the source read-only, creates a consistent SQLite backup including committed WAL data, and imports all records in one PostgreSQL transaction. It compares every imported record before commit and refuses a nonempty destination instead of merging or overwriting it. If validation fails, imported rows roll back. The original SQLite file stays unchanged; it is used only by this migration utility, never by the running API.

Backups are written beside the source under `backups/`. Keep them private. PostgreSQL data lives in the named volume `hatim_postgres_data`; stopping a process does not delete it. For a local PostgreSQL backup:

```sh
mkdir -p backend/data/backups
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backend/data/backups/hatim-postgres.dump
```

That filename is an example; use a fresh filename when retaining multiple backups.

## Leadership and member actions

Choose the outing coordinator while creating an outing. The group owner or current coordinator can transfer that role to an active account-linked member without changing attendance. The outing shows both names and an **إدارة الطلعة والطرد** entry. Unavailable actions explain why; funny removal can be enabled there. Real group removal remains owner-only, available there and in **الأعضاء والطرد** on the group screen. Confirmations stay in one native sheet and failed writes remain visible for retry. Read the [Arabic walkthrough](docs/learning-python-postgres/14-leadership-and-removal.ar.md).

## Link a previous group

After registering or signing in on the original organizer device, choose **اربط قروبي السابق بحسابي**. The server verifies its existing owner token, preserves its members/preferences/settings and creates the first outing. Old writes are then disabled for that group. A returning browser member can claim their old membership while joining with an account if that browser still holds its previous member token. Without that token, no account can impersonate the old member. Existing data is not deleted by migration 002.

The same invitation code continues under the current tunnel origin. For new groups, invited members sign in once and confirm attendance for each outing. Password reset is not yet available; keep the username and password you choose.

## Quick decisions and outing preferences

**وش يناسبني الحين؟** opens from discovery without login. Choose a neighborhood, experience duration and outing context; the API returns up to three choices using every direct-plan companion’s hard constraints. Confirming creates a one-slot plan or explicitly replaces the current anchor. Family/friends context has editable quiet/sharing/discovery priorities, also available in normal plan and group-outing creation/editing. Demo data has no live availability or travel estimates. Read [chapter18](docs/learning-python-postgres/18-quick-decision.ar.md) and [the API contract](docs/api-quick-decision.ar.md).

**Optional group skins:** المعزّب، عند الإشارة، اختاروا أنتم are editable SVG characters with outfit, tone, color, expression, glasses and preset phrases. Members change only their own circle default or outing override. The plan, attendance and choice screen show the effective appearance; closed outings preserve a snapshot, including no skin. Cosmetics never change constraints, votes, roles or draw odds. Migration005 adds nullable JSONB columns without changing earlier migrations. See [chapter19](docs/learning-python-postgres/19-outing-skins.ar.md), [API](docs/api-social.ar.md), and [remaining proposals](docs/proposals/outing-skins.ar.md).

## Small architecture

- **UI:** Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript 6, Expo UI and native GlassEffect. Account, group, outing and decision screens reuse the existing components.
- **API:** FastAPI routers in `backend/hatim/features/`, validated with Pydantic. `main.py` composes them; deterministic ranking stays in `domain/planner.py`. `psycopg` runs parameterized SQL without an ORM.
- **Database:** 12 new tables alongside the 3 existing ones. Accounts, circle memberships, outings, participants, catalog, rounds, votes and fun cards have explicit keys and constraints. Numbered migrations remain checksum-verified.
- **Direct account plans:** migration003 adds optional account ownership to groups, preserving existing guest plans. Both discovery endpoints and both planners read the same PostgreSQL catalog. Settings updates in the current UI send expected values to reject stale writes.
- **Access:** Argon2 passwords and random opaque sessions stored as SHA-256 hashes, expiring in 30 days. Native sessions use SecureStore. Browser sessions are local to their origin. Owners and outing coordinators have separate permissions enforced on every request.
- **Consistency:** writers lock circle → outing → round. One vote per member per round; resolving twice returns the same result. Settings writes compare the client's expected settings to prevent overwriting another device's choice.
- **Updates:** active clients poll every six seconds; stale reads cannot replace local write results. No queue, WebSocket server or AI model is involved.

See [the Arabic architecture and PostgreSQL migration guide](docs/architecture-python-postgres.ar.md).

## Decision rules

Hard constraints are checked before ranking: allergy conflicts or missing absence/cross-contact verification, vegetarian availability, and each person's budget. Concrete vegetarian and mild-food adjustments are retained. Heat preference without a workaround lowers affinity and shows a warning rather than excluding on that preference alone.

Eligible experiences receive editorial points plus 70% average member affinity and 30% lowest member affinity. The anchor comes first. Time takes a prefix of that stable order; anchor/core/flexible ranks and reasons remain explicit. A blocked anchor reserves its slot until the organizer changes/releases it. Time-displaced experiences return when slots expand; manually saved experiences stay in the pocket. Completed experiences consume slots and can be undone if marked accidentally. Each experience, including a coffee/dessert occasion, uses one slot; this is capacity planning, not calendar scheduling.

## Verify

```sh
npm run check
npm run format:check
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
npm run types:api
```

`test:api` runs against real PostgreSQL, using a fresh, randomly named schema per test and cleaning up only that schema. It uses `HATIM_TEST_DATABASE_URL` if configured, otherwise `DATABASE_URL`. Planner tests do not need a database. Coverage includes 180 preserved-decision fixtures, constraints, privacy, validation, concurrent joins, consistent snapshots, rollback, migrations and safe SQLite import.

Browser tests create records in the target API. Start `npm run test:e2e:server` after `npm run web:build`: it creates a randomly named PostgreSQL schema, serves8002 and removes only its own schema on normal termination. In another terminal:

```sh
npx playwright install chromium
HATIM_TEST_URL=http://127.0.0.1:8002 npm run test:e2e
```

The tests cover standalone account entry, direct plan CRUD/recovery from another browser, guest-plan linking, and permanent groups, attendance, opt-in fun, voting, tie-breaking draw, stored results, removal/restoration, plus direct organizer/member joining/editing, contraction, blocked anchor, completion/undo, search, pocket persistence, retry and mobile overflow. Backend OpenAPI export does not start the server or touch the database. Its TypeScript generator is isolated with TS5 because the app uses TS6.

## Scope

The nine experiences, venue names, prices and options are fictional demo content. Allergy verification is intentionally absent, so entering an allergy can correctly block the whole demo catalog. No reservations, live availability, password recovery, catalog editing interface, or permanent hosting are implemented. Accounts, password login/logout and cross-device recovery of saved plans and groups are implemented. Docker deployment files are prepared; selecting hosting is deferred by the user. A hosted PostgreSQL URL can replace the local one; the local Docker setup is not a remote database deployment by itself.

For the school project, this AI-assisted implementation is a learning reference; your own implementation evidence, Figma deliverables and permanent deployment still need their own work. Switching the database alone does not fulfill every academic requirement. The old untracked `docs/learning/` material describes the pre-migration SQLite implementation.

Photography is bundled and attributed in `assets/ATTRIBUTION.md`. IBM Plex Sans Arabic comes from @expo-google-fonts under its bundled OFL license.
