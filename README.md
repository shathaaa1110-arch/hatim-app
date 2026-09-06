# حاتم · Hatim

An Arabic-first React Native app for a group deciding which food experiences deserve its limited meal slots. The organizer uses the iPhone app. Invited members use a browser link, without installing anything.

## Run the public test

Requirements: Node 22.13+ (tested with 25.8.1), npm, Python through `uv`, Xcode 26.4+, CocoaPods, and `cloudflared`.

```sh
npm ci
uv sync --project backend
npm run public:test
```

The script starts a temporary Cloudflare tunnel, writes its URL into `.env.local`, exports the Expo web companion, and starts FastAPI on port 8000. Leave the terminal open. Ctrl+C stops both services. If `cloudflared` is not on PATH, it also accepts `.tools/cloudflared`.

Use **لَمّتنا → اعزم الربع** in the native app to copy a group's actual `/join/<random-code>` invitation. The root web page explains how to open an invitation. `/?preview=organizer` exposes the same organizer UI for development and browser QA; it cannot access an existing organizer's group without that device's token.

Quick Tunnel URLs change on restart. Rebuild the native app after that change and share the newly generated invitation URL. The Mac, API, and tunnel must remain running for members and the iPhone to connect. SQLite group data survives process restarts.

## Run on iPhone through Xcode

Start the backend/tunnel first, so `.env.local` contains the correct HTTPS API address.

```sh
npx expo prebuild --platform ios
open ios/Hatim.xcworkspace
```

In Xcode, select the **Hatim** scheme, your connected iPhone, and your Apple development team under **Signing & Capabilities**. The bundle identifier is `com.hatim.app`; change it in `app.json` and regenerate if your team needs a different identifier.

For a standalone phone test, set **Edit Scheme → Run → Build Configuration → Release**, then Run. Release bundles JavaScript and assets into the app, so Metro is unnecessary. Xcode signing and a physical iPhone are required for device installation.

For the simulator:

```sh
npm run ios:release
```

The generated `ios/` project is reproducible from `app.json`, `package-lock.json`, and Expo prebuild. It is intentionally untracked. Keep app configuration in `app.json`; do not place permanent product changes in generated files. Native Liquid Glass renders on iOS 26+; earlier iOS and web use a translucent fallback. Expo UI provides native sliders and switches.

## Local development

```sh
npm run web:build
npm run api
# Browser companion: http://127.0.0.1:8000
# Organizer preview: http://127.0.0.1:8000/?preview=organizer
```

For native live reload, use `npm start` after generating the iOS project and use a Debug build. All food photos and Arabic font files are bundled. Web and native share React Native components.

## Small, explicit architecture

- **App:** Expo SDK 57, React Native 0.86.3, React 19.2, TypeScript 6, Expo UI and Expo GlassEffect. Four local tabs; no global state framework or unnecessary navigation dependency.
- **API:** Python 3.14.4, FastAPI and Pydantic. Pure ranking functions in `backend/hatim/planner.py`; input/output types generated from OpenAPI into `src/api/schema.d.ts`.
- **Storage:** SQLite with WAL and transactional writes. One organizer token per group, one private token per joining member, and a separate random invitation capability. Tokens are hashed at rest. Native organizer credentials use iOS SecureStore; browser member credentials stay in that browser.
- **Synchronization:** active clients refresh every six seconds. Organizer mutations suppress stale poll results. Save failures stay visible and are retryable. Member profiles belong to the member; the organizer can view constraints and remove members, but cannot edit someone else's profile.
- **Privacy:** invitation responses expose names and the shared plan, with private constraints and adaptation details removed. The organizer sees full constraints. Invitation links grant access to the group's public view; treat them as invitations, not public directory listings.

## Decision rules

1. Check every member's hard constraints before ranking: allergy declarations, verified absence and cross-contact handling, vegetarian availability, and each person's budget ceiling.
2. Preserve a concrete vegetarian or mild-food adjustment where one exists. Allergies never get an ingredient-removal workaround. Missing allergy verification blocks the experience.
3. Rank eligible experiences by editorial score plus a preference score: 70% average affinity and 30% least-served member affinity. Resident/visitor context adds a small explicit affinity bonus. The chosen anchor comes first.
4. Time truncates one stable ranking. It never reshuffles that ranking. Anchor / core / flexible priorities and reasons stay visible.
5. A blocked anchor reserves its slot and displays the conflict. Only the organizer can explicitly change or release it.
6. Time-displaced experiences remain in the pocket and return when capacity increases. Manually pocketed experiences stay there until restored. Marking an experience as lived consumes a slot; consumed slots cannot vanish when time shrinks. Accidental completion can be undone.

One experience occupies one slot, including a deliberately chosen coffee/dessert occasion. Slots are a capacity budget, not a calendar with availability or opening hours.

## Verification

```sh
npm run check
npm run format:check
uv run --project backend ruff check backend/hatim backend/tests
npm run types:api
# With a built web companion and running API:
npx playwright install chromium
npm run test:e2e
```

Backend tests cover all nine contraction sizes, allergy uncertainty and conflicts, dietary adjustments, budgets, consumed capacity, pocket preservation, group isolation, member ownership, privacy, persistence, and capacity limits. Browser tests exercise separate organizer/member sessions, joining, profile edits, plan updates, a blocked anchor, completion/undo, search, saving, reload persistence, and mobile overflow.

The narrow `xcode → uuid ^11.1.1` override fixes GHSA-w5hq-g745-h8pq in Expo's build dependency. `xcode` uses the unchanged `uuid.v4()` CommonJS API. No Expo SDK downgrade is needed. The OpenAPI generator runs in an isolated pinned TypeScript 5 environment because its peer dependency does not yet accept the app's TypeScript 6.

## Content and scope

The nine curated experiences, venue names, prices, and dietary options are **fictional demo content**. Every screen labels that status. None of the demo's allergy-safety assertions is verified, so entering an allergy can correctly block the entire catalog. Replace fixtures with reviewed editorial content and documented cross-contact handling before using the app for real food decisions.

This test implementation does not claim live venue availability, make reservations, issue restaurant safety guarantees, provide account recovery, or run a production public service. A persistent deployment needs a stable domain, backups, invite revocation/expiry, abuse controls, and a deliberate account/recovery policy. Group data currently remains in the local ignored `backend/data/hatim.sqlite3`; no hosted database or third-party analytics is used.

Photography: bundled illustrative images from [Unsplash](https://unsplash.com/), identified by their original photo IDs in `assets/ATTRIBUTION.md`. Typography: IBM Plex Sans Arabic, distributed by `@expo-google-fonts` under its bundled OFL license.

