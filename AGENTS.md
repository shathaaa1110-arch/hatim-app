# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Preserve the product's core

The primary unit is a food experience. Discovery, a plan that adapts to meal slots and personal constraints, and the pocket are the core. Open discovery first; do not require an account, persistent group or outing creation merely to browse. Persistent groups, saved members, voting, roles and playful removal are optional additions. Keep direct planning and browser invitations for its companions usable independently, and preserve participants' hard constraints in every planning flow.

# Keep architecture and learning material in sync

For every implemented app feature or behavior change, update the relevant architecture, repository structure explanation, database/ERD, API contract, and Arabic beginner documentation in the same change. Include the affected flow and validation evidence. If a diagram or layer is unaffected, do not rewrite it merely to create a diff.

Keep ideas and proposals explicitly separate from implemented behavior. Product brainstorming does not authorize implementation by itself. The persistent-groups discussion is preserved historically in `docs/proposals/persistent-groups.ar.md`. Its implementation is documented in `docs/architecture-python-postgres.ar.md`, `docs/api-social.ar.md`, and `docs/learning-python-postgres/13-social-groups.ar.md`; keep those aligned with subsequent changes.

The annotated Python/PostgreSQL codebook is an immutable snapshot of the source revision stated in its introduction. Preserve that provenance; document newer source versions explicitly rather than silently attaching old line explanations to new code.

# Preserve module boundaries

The implemented module map is in `docs/architecture-modules.ar.md`. Frontend composition belongs in `src/application`, feature behavior in `src/features/<name>`, and shared tools in `src/shared`. Cross-feature imports must use public `index.ts` entrypoints. Backend features expose their public interface in `__init__.py`; `main.py` composes routers, `domain` contains shared pure decision rules, and `core` contains infrastructure.

Declare required feature dependencies in `architecture.json` and run `npm run check:architecture` (also included in `npm run check`). Do not resolve a cycle by broadly allowing dependencies or moving feature logic into shared. Keep SQL table ownership and transaction boundaries explicit; `integrations/legacy_plans.py` is the existing atomic compatibility bridge, not a general feature bucket. Add services/repositories when behavior warrants them, not empty layers for every feature.
