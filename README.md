# حاتم · Hatim

An Arabic-first React Native app for a group choosing food experiences within a limited number of meal slots. The organizer uses the iPhone app; invited members use a browser link.

This branch uses **Python 3.14 + FastAPI + PostgreSQL 18**. The .NET implementation remains on [codex/dotnet-backend](https://github.com/shathaaa1110-arch/hatim-app/tree/codex/dotnet-backend), including its Arabic learning guide. The app's API shape, planner rules, and native UI remain compatible.

For a beginner's explanation of this implementation, read [ابني حاتم بيدك — Python وPostgreSQL](docs/learning-python-postgres/README.ar.md). The Arabic guide includes 13 lessons, an annotated reference covering 48 source/configuration files, school-requirement gaps, and the [application architecture](docs/architecture-python-postgres.ar.md). It distinguishes the current implementation from proposed account and deployment work.

Under discussion, not implemented: [persistent groups, separate outings, voting, member roles, a shared random draw, and playful interactions](docs/proposals/persistent-groups.ar.md), with proposed architecture and a [beginner design explanation](docs/learning-python-postgres/group-feature-design.ar.md). Feature changes must keep architecture and learning material in sync as documented in AGENTS.md.

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

The script starts a temporary Cloudflare tunnel, saves its HTTPS origin in the root `.env.local`, exports the Expo web companion, and starts FastAPI on port 8000. It can reuse a healthy Python/PostgreSQL Hatim API already serving the web companion on that port. It refuses an unrelated or .NET service. Reusing a process does not reload modified backend code; restart your API after backend edits.

Leave the terminal open. Ctrl+C stops only the API/tunnel processes started by the script; PostgreSQL keeps running. If cloudflared is not on PATH, `.tools/cloudflared` is also supported. Only the HTTP API is tunneled, never the PostgreSQL port.

In the native app use **لَمّتنا → اعزم الربع** to copy the real `/join/<random-code>` link. The root website is the invitation entry, not organizer administration. The Mac, database, API, and tunnel must remain running. Quick Tunnel origins change on restart: rebuild the native app with the new origin and share the refreshed invitation URL. Group IDs and invitation codes remain in PostgreSQL.

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

## Small architecture

- **UI:** Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript 6, Expo UI and GlassEffect. Four local organizer tabs and a member invitation screen.
- **API:** FastAPI routes and Pydantic validation. Pure deterministic ranking in `backend/hatim/planner.py`. `psycopg` executes parameterized PostgreSQL queries; no ORM or external backend service.
- **Database:** groups and members tables; settings/preferences stored as JSONB, timestamps as TIMESTAMPTZ, organizer flag as BOOLEAN. Numbered SQL migrations with recorded checksums. Reads use repeatable-read snapshots. Mutations lock the group's row before inspecting/changing its state; concurrent joins cannot exceed twelve members.
- **Access:** separate random invitation, organizer, and member capabilities. Private tokens are hashed at rest. Native organizer credentials use SecureStore; browser credentials stay in that browser. Organizer sees constraints and can remove members, but cannot edit another member's profile. Invite responses omit private constraints and adaptations.
- **Updates:** active clients poll every six seconds. Organizer mutations suppress stale poll results. No queue, WebSocket server, or AI model is involved.

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

Browser tests create records in the target API. Use a separate test database/schema rather than a personal-data service. With a built web companion and an API pointing to your test database:

```sh
npx playwright install chromium
HATIM_TEST_URL=http://127.0.0.1:8002 npm run test:e2e
```

The tests cover separate organizer/member browsers, joining/editing, contraction, blocked anchor, completion/undo, search, pocket persistence, retry and mobile overflow. Configure the test API to listen on 8002 for this example. Backend OpenAPI export does not start the server or touch the database. Its TypeScript generator is isolated with TS5 because the app uses TS6.

## Scope

The nine experiences, venue names, prices and options are fictional demo content. Allergy verification is intentionally absent, so entering an allergy can correctly block the whole demo catalog. No reservations, live availability, account/password login, account recovery, or permanent hosting are implemented. A hosted PostgreSQL URL can replace the local one; the local Docker setup is not a remote database deployment by itself.

For the school project, independently implemented authentication, Figma deliverables, learning evidence and permanent deployment still need their own work. Switching the database alone does not fulfill every academic requirement. The old untracked `docs/learning/` material describes the pre-migration SQLite implementation.

Photography is bundled and attributed in `assets/ATTRIBUTION.md`. IBM Plex Sans Arabic comes from @expo-google-fonts under its bundled OFL license.
